"""Python twin of stdAt() in src/logic.js: the five anchors for one standard at a bodyweight (log-log interpolation)."""
import math

def stdAt(st, sex, bw):
    rows = st[sex]; keys = sorted(float(k) for k in rows)
    def row(k): return rows[next(x for x in rows if float(x) == k)]
    x = math.log(min(max(bw, keys[0] * 0.7), keys[2] * 1.5)); xs = [math.log(k) for k in keys]; out = []
    for i in range(5):
        ys = [math.log(max(row(k)[i], 0.3)) for k in keys]
        j = 0 if x <= xs[1] else 1
        out.append(math.exp(ys[j] + (ys[j + 1] - ys[j]) * (x - xs[j]) / (xs[j + 1] - xs[j])))
    for i in range(1, 5):
        if out[i] <= out[i - 1]: out[i] = out[i - 1] * 1.02
    return out
