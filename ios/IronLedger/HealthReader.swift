import Foundation
import HealthKit

/// Reads Apple Health and turns it into one row per day for the web app:
/// ["d": "2026-11-01", "t": ms, "wlb", "bf" (%), "rhr", "hrv" (ms), "steps", "kcal", "sleep" (hours)]
/// Nothing is ever written to Health.
final class HealthReader {
    static var available: Bool { HKHealthStore.isHealthDataAvailable() }

    private let store = HKHealthStore()
    private let calendar = Calendar.current

    private var readTypes: Set<HKObjectType> {
        var types = Set<HKObjectType>()
        let ids: [HKQuantityTypeIdentifier] = [.bodyMass, .bodyFatPercentage, .restingHeartRate,
                                               .heartRateVariabilitySDNN, .stepCount, .activeEnergyBurned]
        for id in ids {
            if let t = HKObjectType.quantityType(forIdentifier: id) { types.insert(t) }
        }
        if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { types.insert(sleep) }
        return types
    }

    func requestAuthorization(_ done: @escaping (String?) -> Void) {
        guard Self.available else { done("Apple Health isn't available on this device."); return }
        store.requestAuthorization(toShare: nil, read: readTypes) { ok, error in
            done(ok ? nil : (error?.localizedDescription ?? "Apple Health access was not given."))
        }
    }

    // MARK: reading

    private let lock = NSLock()
    private var rows: [Date: [String: Any]] = [:]

    private func put(_ day: Date, _ key: String, _ value: Any) {
        lock.lock(); defer { lock.unlock() }
        var row = rows[day] ?? [:]
        row[key] = value
        rows[day] = row
    }

    func readDays(_ days: Int, done: @escaping ([[String: Any]]) -> Void) {
        let today = calendar.startOfDay(for: Date())
        guard let start = calendar.date(byAdding: .day, value: -(days - 1), to: today) else { done([]); return }
        lock.lock(); rows = [:]; lock.unlock()
        let group = DispatchGroup()

        // daily totals: only finished days, so today's half-day doesn't drag the average down
        dailyStats(.stepCount, .cumulativeSum, .count(), "steps", start, today, skipToday: true, group)
        dailyStats(.activeEnergyBurned, .cumulativeSum, .kilocalorie(), "kcal", start, today, skipToday: true, group)
        // daily averages
        dailyStats(.restingHeartRate, .discreteAverage, HKUnit.count().unitDivided(by: .minute()), "rhr", start, today, skipToday: false, group)
        dailyStats(.heartRateVariabilitySDNN, .discreteAverage, .secondUnit(with: .milli), "hrv", start, today, skipToday: false, group)
        // the last reading of each day
        lastOfDay(.bodyMass, .pound(), "wlb", scale: 1, start, group)
        lastOfDay(.bodyFatPercentage, .percent(), "bf", scale: 100, start, group)
        // sleep, counted for the morning you woke up
        sleepByNight(start, group)

        group.notify(queue: .main) {
            self.lock.lock(); let all = self.rows; self.lock.unlock()
            let fmt = DateFormatter()
            fmt.calendar = Calendar(identifier: .gregorian)
            fmt.locale = Locale(identifier: "en_US_POSIX")
            fmt.timeZone = self.calendar.timeZone
            fmt.dateFormat = "yyyy-MM-dd"
            let now = Date()
            let out: [[String: Any]] = all.keys.sorted().compactMap { day in
                guard var row = all[day], !row.isEmpty else { return nil }
                row["d"] = fmt.string(from: day)
                if row["t"] == nil {
                    let noon = self.calendar.date(byAdding: .hour, value: 12, to: day) ?? day
                    row["t"] = (min(noon, now).timeIntervalSince1970 * 1000).rounded()
                }
                return row
            }
            done(out)
        }
    }

    private func dailyStats(_ id: HKQuantityTypeIdentifier, _ option: HKStatisticsOptions, _ unit: HKUnit, _ key: String,
                            _ start: Date, _ today: Date, skipToday: Bool, _ group: DispatchGroup) {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return }
        group.enter()
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: [])
        let query = HKStatisticsCollectionQuery(quantityType: type, quantitySamplePredicate: predicate, options: option,
                                                anchorDate: today, intervalComponents: DateComponents(day: 1))
        query.initialResultsHandler = { _, collection, _ in
            collection?.enumerateStatistics(from: start, to: Date()) { stats, _ in
                let day = self.calendar.startOfDay(for: stats.startDate)
                if skipToday && day == today { return }
                let quantity = option.contains(.cumulativeSum) ? stats.sumQuantity() : stats.averageQuantity()
                if let q = quantity {
                    let v = q.doubleValue(for: unit)
                    self.put(day, key, (v * 10).rounded() / 10)
                }
            }
            group.leave()
        }
        store.execute(query)
    }

    private func lastOfDay(_ id: HKQuantityTypeIdentifier, _ unit: HKUnit, _ key: String, scale: Double,
                           _ start: Date, _ group: DispatchGroup) {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return }
        group.enter()
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: [])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { _, samples, _ in
            for case let s as HKQuantitySample in samples ?? [] {
                let day = self.calendar.startOfDay(for: s.startDate)
                let v = s.quantity.doubleValue(for: unit) * scale
                self.put(day, key, (v * 10).rounded() / 10)
                if key == "wlb" { self.put(day, "t", (s.startDate.timeIntervalSince1970 * 1000).rounded()) }
            }
            group.leave()
        }
        store.execute(query)
    }

    private func sleepByNight(_ start: Date, _ group: DispatchGroup) {
        guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return }
        group.enter()
        let from = calendar.date(byAdding: .day, value: -1, to: start) ?? start
        let predicate = HKQuery.predicateForSamples(withStart: from, end: Date(), options: [])
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
            let asleep = HKCategoryValueSleepAnalysis.allAsleepValues.map { $0.rawValue }
            // a night belongs to the day you woke up (anything ending after 6 pm counts toward the next day)
            var spans: [Date: [(Date, Date)]] = [:]
            for case let s as HKCategorySample in samples ?? [] where asleep.contains(s.value) {
                let day = self.calendar.startOfDay(for: s.endDate.addingTimeInterval(6 * 3600))
                if day < start { continue }
                spans[day, default: []].append((s.startDate, s.endDate))
            }
            // the watch and the phone can both record the same night: merge overlaps before adding up
            for (day, list) in spans {
                let sorted = list.sorted { $0.0 < $1.0 }
                var total: TimeInterval = 0
                var cur = sorted[0]
                for span in sorted.dropFirst() {
                    if span.0 <= cur.1 { cur.1 = max(cur.1, span.1) } else { total += cur.1.timeIntervalSince(cur.0); cur = span }
                }
                total += cur.1.timeIntervalSince(cur.0)
                if total > 15 * 60 { self.put(day, "sleep", ((total / 3600) * 100).rounded() / 100) }
            }
            group.leave()
        }
        store.execute(query)
    }
}
