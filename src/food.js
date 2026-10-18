/* ===== Eat: foods you have, goals, meal ideas, daily log =====
   Nutrition numbers are typical values (USDA-style averages) for the portion described; brands vary. */
var FOOD_CATS = [['protein', 'Proteins'], ['carb', 'Grains, bread & potatoes'], ['fruit', 'Fruit'], ['veg', 'Vegetables'], ['dairy', 'Dairy & milk'], ['fat', 'Fats, nuts & toppings'], ['extra', 'Sauces & snacks']];
/* u: unit, g: grams per unit (for display), st/mn/mx: portion step/min/max in units, k p c f: per unit.
   For u 'g' the macros are per 1 g (written as per-100g / 100). x: things it contains (for diets/allergies). */
var FOODS = (function () {
  function G(id, n, e, cat, r, k, p, c, f, x, st, mn, mx) { return { id: id, n: n, e: e, cat: cat, r: r, u: 'g', g: 1, k: k / 100, p: p / 100, c: c / 100, f: f / 100, x: x || [], st: st || 10, mn: mn || 50, mx: mx || 250 }; }
  function U(id, n, e, cat, r, u, g, k, p, c, f, x, st, mn, mx) { return { id: id, n: n, e: e, cat: cat, r: r, u: u, g: g, k: k, p: p, c: c, f: f, x: x || [], st: st || 1, mn: mn || 1, mx: mx || 3 }; }
  return [
    // proteins (cooked weights)
    G('chicken', 'Chicken breast', '🍗', 'protein', ['main'], 165, 31, 0, 3.6, ['poultry'], 10, 100, 280),
    G('thigh', 'Chicken thighs', '🍗', 'protein', ['main'], 209, 26, 0, 10.9, ['poultry'], 10, 100, 250),
    G('turkey', 'Ground turkey (93% lean)', '🦃', 'protein', ['main'], 200, 27, 0, 10, ['poultry'], 10, 100, 250),
    G('beef', 'Lean ground beef (90%)', '🥩', 'protein', ['main'], 217, 26, 0, 12, ['meat'], 10, 100, 230),
    G('steak', 'Sirloin steak', '🥩', 'protein', ['main', 'keto'], 200, 29, 0, 9, ['meat'], 10, 120, 280),
    G('pork', 'Pork tenderloin', '🐖', 'protein', ['main'], 143, 26, 0, 3.5, ['meat', 'pork'], 10, 100, 250),
    G('salmon', 'Salmon', '🐟', 'protein', ['main', 'keto'], 208, 22, 0, 13, ['fish'], 10, 100, 230),
    G('tuna', 'Canned tuna (in water)', '🥫', 'protein', ['main', 'deli'], 116, 26, 0, 1, ['fish'], 10, 80, 200),
    G('shrimp', 'Shrimp', '🦐', 'protein', ['main'], 99, 24, 0.2, 0.3, ['shellfish'], 10, 100, 280),
    G('cod', 'White fish (cod, tilapia)', '🐠', 'protein', ['main'], 110, 24, 0, 1.5, ['fish'], 10, 120, 300),
    U('egg', 'Eggs', '🥚', 'protein', ['egg'], 'egg', 50, 72, 6.3, 0.4, 4.8, ['egg'], 1, 2, 5),
    G('whites', 'Egg whites (carton)', '🥚', 'protein', ['egg2'], 52, 11, 0.7, 0.2, ['egg'], 20, 100, 300),
    G('deli', 'Deli turkey slices', '🥪', 'protein', ['deli'], 104, 18, 4, 1.7, ['poultry'], 10, 60, 150),
    U('bacon', 'Bacon', '🥓', 'protein', ['side'], 'slice', 8, 43, 3, 0.1, 3.3, ['meat', 'pork'], 1, 2, 4),
    G('jerky', 'Beef jerky', '🥩', 'protein', ['snackP'], 410, 33, 11, 26, ['meat', 'soy'], 10, 30, 60),
    G('tofu', 'Firm tofu', '🧊', 'protein', ['main', 'tofu'], 144, 17, 3, 9, ['soy'], 10, 120, 300),
    G('tempeh', 'Tempeh', '🟫', 'protein', ['main'], 192, 20, 8, 11, ['soy'], 10, 100, 200),
    G('lentils', 'Lentils', '🫘', 'protein', ['main', 'legume'], 116, 9, 20, 0.4, [], 10, 120, 300),
    G('blackbeans', 'Black beans', '🫘', 'protein', ['main', 'legume'], 132, 8.9, 24, 0.5, [], 10, 100, 250),
    G('chickpeas', 'Chickpeas', '🧆', 'protein', ['main', 'legume'], 164, 8.9, 27, 2.6, [], 10, 100, 250),
    G('edamame', 'Edamame', '🫛', 'protein', ['main', 'snackP'], 121, 12, 9, 5, ['soy'], 10, 100, 250),
    U('whey', 'Whey protein', '🥤', 'protein', ['shake'], 'scoop', 30, 120, 24, 3, 1.5, ['dairy'], 1, 1, 2),
    U('pea', 'Plant protein powder', '🌱', 'protein', ['shake'], 'scoop', 33, 120, 22, 4, 2, [], 1, 1, 2),
    U('bar', 'Protein bar', '🍫', 'protein', ['snackP'], 'bar', 60, 200, 20, 22, 7, ['dairy', 'soy'], 1, 1, 1),
    // carbs (cooked weights)
    G('rice', 'White rice', '🍚', 'carb', ['grain'], 130, 2.7, 28, 0.3, [], 25, 75, 400),
    G('brownrice', 'Brown rice', '🍚', 'carb', ['grain'], 123, 2.7, 26, 1, [], 25, 75, 400),
    G('quinoa', 'Quinoa', '🌾', 'carb', ['grain'], 120, 4.4, 21, 1.9, [], 25, 75, 350),
    G('couscous', 'Couscous', '🌾', 'carb', ['grain'], 112, 3.8, 23, 0.2, ['gluten'], 25, 75, 350),
    G('pasta', 'Pasta', '🍝', 'carb', ['pasta'], 158, 5.8, 31, 0.9, ['gluten'], 25, 100, 400),
    G('oats', 'Rolled oats (dry)', '🥣', 'carb', ['oats'], 389, 16.9, 66, 6.9, [], 10, 30, 120),
    U('wwbread', 'Whole wheat bread', '🍞', 'carb', ['bread'], 'slice', 32, 80, 4, 14, 1, ['gluten'], 1, 1, 4),
    U('bread', 'White bread', '🍞', 'carb', ['bread'], 'slice', 28, 75, 2.6, 14, 1, ['gluten'], 1, 1, 4),
    U('bagel', 'Bagel', '🥯', 'carb', ['bread'], 'bagel', 105, 270, 11, 53, 1.7, ['gluten'], 1, 1, 1),
    U('muffin', 'English muffin', '🥯', 'carb', ['bread'], 'muffin', 57, 134, 4.4, 26, 1, ['gluten'], 1, 1, 2),
    U('tortilla', 'Flour tortillas', '🌯', 'carb', ['wrap'], 'tortilla', 49, 140, 4, 24, 3.5, ['gluten'], 1, 1, 3),
    U('corntort', 'Corn tortillas', '🌮', 'carb', ['taco'], 'tortilla', 26, 57, 1.5, 12, 0.7, [], 1, 2, 6),
    U('pita', 'Pita', '🫓', 'carb', ['wrap', 'bread'], 'pita', 60, 165, 5.5, 33, 0.7, ['gluten'], 1, 1, 2),
    G('potato', 'Potatoes', '🥔', 'carb', ['potato'], 93, 2.5, 21, 0.1, [], 25, 100, 450),
    G('sweetpot', 'Sweet potatoes', '🍠', 'carb', ['potato'], 90, 2, 21, 0.2, [], 25, 100, 450),
    U('ricecake', 'Rice cakes', '🍘', 'carb', ['crisp'], 'cake', 9, 35, 0.7, 7.3, 0.3, [], 1, 2, 4),
    G('granola', 'Granola', '🥣', 'carb', ['topping'], 470, 10, 64, 20, ['nuts', 'gluten'], 10, 20, 70),
    // fruit
    U('banana', 'Bananas', '🍌', 'fruit', ['fruit'], 'banana', 118, 105, 1.3, 27, 0.4, [], 1, 1, 2),
    U('apple', 'Apples', '🍎', 'fruit', ['fruit'], 'apple', 182, 95, 0.5, 25, 0.3, [], 1, 1, 1),
    G('berries', 'Blueberries', '🫐', 'fruit', ['fruit', 'berry'], 57, 0.7, 14.5, 0.3, [], 25, 50, 250),
    G('straw', 'Strawberries', '🍓', 'fruit', ['fruit', 'berry'], 32, 0.7, 7.7, 0.3, [], 25, 75, 300),
    U('orange', 'Oranges', '🍊', 'fruit', ['fruit'], 'orange', 131, 62, 1.2, 15.4, 0.2, [], 1, 1, 2),
    G('grapes', 'Grapes', '🍇', 'fruit', ['fruit'], 69, 0.7, 18, 0.2, [], 25, 75, 250),
    G('mango', 'Mango', '🥭', 'fruit', ['fruit'], 60, 0.8, 15, 0.4, [], 25, 75, 250),
    G('pineapple', 'Pineapple', '🍍', 'fruit', ['fruit'], 50, 0.5, 13, 0.1, [], 25, 75, 250),
    // vegetables
    G('broccoli', 'Broccoli', '🥦', 'veg', ['veg', 'green'], 35, 2.4, 7.2, 0.4, [], 25, 75, 250),
    G('spinach', 'Spinach', '🥬', 'veg', ['greens', 'veg', 'green'], 23, 2.9, 3.6, 0.4, [], 10, 30, 150),
    G('greens', 'Salad greens', '🥗', 'veg', ['greens'], 15, 1.4, 2.9, 0.2, [], 10, 50, 200),
    G('kale', 'Kale', '🥬', 'veg', ['greens', 'veg', 'green'], 35, 2.9, 4.4, 1.5, [], 10, 40, 150),
    G('pepper', 'Bell peppers', '🫑', 'veg', ['veg', 'raw'], 31, 1, 6, 0.3, [], 25, 50, 200),
    G('onion', 'Onions', '🧅', 'veg', ['veg', 'aroma'], 40, 1.1, 9.3, 0.1, [], 25, 40, 120),
    G('tomato', 'Tomatoes', '🍅', 'veg', ['veg', 'raw'], 18, 0.9, 3.9, 0.2, [], 25, 50, 200),
    G('carrot', 'Carrots', '🥕', 'veg', ['veg', 'raw'], 41, 0.9, 10, 0.2, [], 25, 50, 200),
    G('zucchini', 'Zucchini', '🥒', 'veg', ['veg', 'green'], 17, 1.2, 3.1, 0.3, [], 25, 75, 250),
    G('greenbeans', 'Green beans', '🫛', 'veg', ['veg', 'green'], 31, 1.8, 7, 0.2, [], 25, 75, 250),
    G('asparagus', 'Asparagus', '🌱', 'veg', ['veg', 'green'], 20, 2.2, 3.9, 0.1, [], 25, 75, 250),
    G('mushroom', 'Mushrooms', '🍄', 'veg', ['veg'], 22, 3.1, 3.3, 0.3, [], 25, 50, 200),
    G('cucumber', 'Cucumber', '🥒', 'veg', ['raw'], 15, 0.7, 3.6, 0.1, [], 25, 75, 250),
    G('cauli', 'Cauliflower', '🥦', 'veg', ['veg', 'lowcarb'], 25, 1.9, 5, 0.3, [], 25, 100, 300),
    G('mixedveg', 'Frozen mixed vegetables', '🧊', 'veg', ['veg'], 65, 2.9, 13, 0.2, [], 25, 75, 250),
    G('corn', 'Corn', '🌽', 'veg', ['veg'], 96, 3.4, 21, 1.5, [], 25, 50, 200),
    G('peas', 'Green peas', '🫛', 'veg', ['veg', 'green'], 84, 5.4, 15.6, 0.2, [], 25, 50, 200),
    G('cabbage', 'Cabbage / coleslaw mix', '🥬', 'veg', ['veg'], 25, 1.3, 5.8, 0.1, [], 25, 75, 250),
    // dairy & milk
    G('greekyog', 'Greek yogurt (0%)', '🥛', 'dairy', ['yog'], 59, 10.3, 3.6, 0.4, ['dairy'], 25, 150, 350),
    G('cottage', 'Cottage cheese (2%)', '🧀', 'dairy', ['yog'], 84, 11, 4.3, 2.3, ['dairy'], 25, 150, 300),
    U('milk', 'Milk (2%)', '🥛', 'dairy', ['milk'], 'cup', 244, 122, 8, 12, 4.8, ['dairy'], 0.5, 0.5, 2),
    U('skim', 'Skim milk', '🥛', 'dairy', ['milk'], 'cup', 245, 83, 8.3, 12, 0.2, ['dairy'], 0.5, 0.5, 2),
    U('almondmilk', 'Almond milk (unsweetened)', '🥛', 'dairy', ['milk'], 'cup', 240, 35, 1, 1.5, 2.5, ['nuts'], 0.5, 0.5, 2),
    U('soymilk', 'Soy milk', '🥛', 'dairy', ['milk'], 'cup', 243, 100, 7, 8, 4, ['soy'], 0.5, 0.5, 2),
    G('cheddar', 'Cheddar cheese', '🧀', 'dairy', ['cheese', 'fat'], 403, 25, 1.3, 33, ['dairy'], 5, 15, 50),
    G('mozz', 'Mozzarella (part-skim)', '🧀', 'dairy', ['cheese', 'fat', 'snackP'], 254, 24.6, 2.8, 16, ['dairy'], 5, 20, 60),
    G('feta', 'Feta', '🧀', 'dairy', ['cheese', 'fat'], 265, 14, 4, 21, ['dairy'], 5, 15, 50),
    U('parm', 'Parmesan', '🧀', 'dairy', ['parm'], 'tbsp', 5, 21, 1.9, 0.2, 1.4, ['dairy'], 1, 1, 3),
    // fats, nuts & toppings
    U('oil', 'Olive oil', '🫒', 'fat', ['oil', 'dress'], 'tbsp', 13.5, 119, 0, 0, 13.5, [], 0.5, 0.5, 2),
    U('butter', 'Butter', '🧈', 'fat', ['oil'], 'tbsp', 14, 102, 0.1, 0, 11.5, ['dairy'], 0.5, 0.5, 2),
    U('avocado', 'Avocado', '🥑', 'fat', ['fat', 'avo'], 'avocado', 136, 218, 2.7, 11.6, 20, [], 0.5, 0.5, 1),
    U('pb', 'Peanut butter', '🥜', 'fat', ['nutbutter', 'topping'], 'tbsp', 16, 95, 3.5, 3.5, 8, ['peanuts'], 1, 1, 3),
    G('almonds', 'Almonds', '🌰', 'fat', ['nuts', 'topping'], 579, 21, 22, 50, ['nuts'], 5, 15, 45),
    G('walnuts', 'Walnuts', '🌰', 'fat', ['nuts', 'topping'], 654, 15, 14, 65, ['nuts'], 5, 15, 40),
    U('chia', 'Chia seeds', '🌱', 'fat', ['topping'], 'tbsp', 12, 58, 2, 5, 3.7, [], 1, 1, 2),
    U('honey', 'Honey', '🍯', 'fat', ['topping', 'sweet'], 'tbsp', 21, 64, 0, 17, 0, ['honey'], 0.5, 0.5, 1),
    G('choc', 'Dark chocolate', '🍫', 'fat', ['treat'], 600, 8, 45, 43, [], 10, 10, 40),
    // sauces & snacks
    U('soy', 'Soy sauce', '🍶', 'extra', ['sauce', 'asian'], 'tbsp', 16, 9, 1.3, 0.8, 0, ['soy', 'gluten'], 1, 1, 2),
    U('salsa', 'Salsa', '🌶️', 'extra', ['sauce', 'mexican'], 'tbsp', 16, 5, 0.25, 1, 0, [], 1, 2, 6),
    U('marinara', 'Marinara sauce', '🍅', 'extra', ['sauce', 'italian'], 'cup', 250, 140, 4, 20, 4, [], 0.5, 0.5, 1),
    U('pesto', 'Pesto', '🌿', 'extra', ['sauce', 'italian'], 'tbsp', 16, 80, 1, 1, 8, ['dairy', 'nuts'], 1, 1, 2),
    U('hummus', 'Hummus', '🧆', 'extra', ['sauce', 'dip', 'med'], 'tbsp', 15, 35, 1, 2, 2.5, [], 1, 2, 6),
    U('hotsauce', 'Hot sauce', '🌶️', 'extra', ['sauce', 'spicy'], 'tsp', 5, 0, 0, 0, 0, [], 1, 1, 2),
    U('teriyaki', 'Teriyaki sauce', '🍶', 'extra', ['sauce', 'asian'], 'tbsp', 18, 16, 1, 3, 0, ['soy', 'gluten'], 1, 1, 2),
    U('bbq', 'BBQ sauce', '🍖', 'extra', ['sauce'], 'tbsp', 17, 29, 0.1, 7, 0.1, [], 1, 1, 2)
  ];
})();
var FOOD_BY = {}; FOODS.forEach(function (f) { FOOD_BY[f.id] = f; });
var CUSTOM_USE = [['main', 'Main protein'], ['carb', 'Carb side'], ['veg', 'Vegetable'], ['bfast', 'Breakfast'], ['snack', 'Snack'], ['none', 'Just for logging']];
var CUSTOM_HAS = [['meat', 'Meat'], ['poultry', 'Poultry'], ['fish', 'Fish'], ['pork', 'Pork'], ['dairy', 'Dairy'], ['egg', 'Egg'], ['gluten', 'Gluten'], ['nuts', 'Nuts'], ['peanuts', 'Peanuts'], ['soy', 'Soy']];
var CUSTOM_KEY = null;
function syncCustom(F) {
  var key = JSON.stringify(F.custom || []); if (key === CUSTOM_KEY) return; CUSTOM_KEY = key;
  for (var i = FOODS.length - 1; i >= 0; i--) if (FOODS[i].custom) { delete FOOD_BY[FOODS[i].id]; FOODS.splice(i, 1); }
  (F.custom || []).forEach(function (c) {
    var roles = { main: ['main'], carb: ['grain', 'potato'], veg: ['veg'], bfast: ['cbf'], snack: ['snackP'], none: [] }[c.use] || [];
    var cat = { main: 'protein', carb: 'carb', veg: 'veg', bfast: 'protein', snack: 'extra', none: 'extra' }[c.use] || 'extra';
    var fd = { id: c.id, n: c.n, e: c.e || '🍽️', cat: cat, r: roles, u: c.u || 'serving', g: 0, k: +c.k || 0, p: +c.p || 0, c: +c.c || 0, f: +c.f || 0, x: c.x || [], st: 0.5, mn: c.use === 'veg' ? 1 : 0.5, mx: c.use === 'main' || c.use === 'carb' ? 3 : 2, custom: 1 };
    FOODS.push(fd); FOOD_BY[fd.id] = fd;
  });
}

var DIETS = {
  any: { n: 'Anything', no: [] },
  veg: { n: 'Vegetarian', no: ['meat', 'poultry', 'fish', 'shellfish', 'pork'] },
  pesc: { n: 'Pescatarian', no: ['meat', 'poultry', 'pork'] },
  vegan: { n: 'Vegan', no: ['meat', 'poultry', 'fish', 'shellfish', 'pork', 'dairy', 'egg', 'honey'] },
  keto: { n: 'Low-carb / keto', no: [] }
};
var AVOID = [['dairy', 'Dairy'], ['egg', 'Eggs'], ['gluten', 'Gluten'], ['peanuts', 'Peanuts'], ['nuts', 'Tree nuts'], ['soy', 'Soy'], ['fish', 'Fish'], ['shellfish', 'Shellfish'], ['pork', 'Pork'], ['spicy', 'Spicy food']];
var CUISINES = [['american', 'Classic'], ['mexican', 'Mexican'], ['asian', 'Asian'], ['italian', 'Italian'], ['med', 'Mediterranean']];
var FGOALS = {
  lose: { n: 'Lose fat', d: 'About 0.5–1 lb a week', adj: -0.2, cap: -500, ppk: 2.2 },
  recomp: { n: 'Recomp', d: 'Small deficit, keep strength', adj: -0.1, cap: -300, ppk: 2.2 },
  maintain: { n: 'Maintain', d: 'Stay where you are', adj: 0, cap: 0, ppk: 1.8 },
  lean: { n: 'Lean bulk', d: 'Slow gain, mostly muscle', adj: 0.1, cap: 350, ppk: 2.0 },
  bulk: { n: 'Bulk', d: 'Faster gain', adj: 0.15, cap: 600, ppk: 2.0 }
};
var ACTS = [[1.2, 'Desk job, little activity'], [1.375, 'Light: on your feet some, trains 1–3×/week'], [1.55, 'Moderate: trains 3–5×/week'], [1.725, 'Very active: hard training 6–7×/week or physical job']];
var MEALSETS = { 3: ['b', 'l', 'd'], 4: ['b', 'l', 'd', 's'], 5: ['b', 's', 'l', 's', 'd'] };
var MEALN = { b: 'Breakfast', l: 'Lunch', d: 'Dinner', s: 'Snack' };
var MSPLIT = { 3: { b: .3, l: .35, d: .35 }, 4: { b: .25, l: .3, d: .32, s: .13 }, 5: { b: .22, l: .27, d: .3, s: .105 } };

function foodDefaults() { return { setup: false, age: 30, act: 1.55, goal: 'maintain', diet: 'any', avoid: [], cuisines: [], have: [], never: [], meals: 4, onlyHave: true, simple: false, kcal: null, prot: null, days: {}, log: {}, custom: [], bought: [] }; }
function FS() {
  var f = S.settings.food;
  if (!f || typeof f !== 'object') f = S.settings.food = foodDefaults();
  var d = foodDefaults(); for (var k in d) if (f[k] === undefined) f[k] = d[k];
  syncCustom(f);
  return f;
}
function dayKey(t) { var d = new Date(t || Date.now()); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

/* ----- targets ----- */
function foodTargets() {
  var F = FS(), B = profB(), g = FGOALS[F.goal] || FGOALS.maintain;
  var out = { kcal: 2200, p: 150, c: 230, f: 70, est: true, tdee: null };
  if (B) {
    var kg = curWeightLb(B) / LB, cm = B.h, age = +F.age || 30;
    var bmr = 10 * kg + 6.25 * cm - 5 * age + (B.sex === 'M' ? 5 : -161), tdee = bmr * (+F.act || 1.55);
    var adj = tdee * g.adj; if (g.cap < 0) adj = Math.max(adj, g.cap); else if (g.cap > 0) adj = Math.min(adj, g.cap);
    out.tdee = Math.round(tdee / 10) * 10; out.kcal = Math.round((tdee + adj) / 10) * 10; out.p = Math.round(kg * g.ppk / 5) * 5; out.est = false;
  }
  if (F.kcal > 800) out.kcal = +F.kcal;
  if (F.prot > 30) out.p = +F.prot;
  var floor = B && B.sex === 'F' ? 1200 : 1500; if (out.kcal < floor) out.kcal = floor;
  out.p = Math.min(out.p, Math.round(out.kcal * 0.4 / 4));
  if (F.diet === 'keto') { out.c = 40; out.f = Math.max(40, Math.round((out.kcal - out.p * 4 - out.c * 4) / 9)); }
  else { out.f = Math.round(out.kcal * 0.28 / 9); out.c = Math.max(50, Math.round((out.kcal - out.p * 4 - out.f * 9) / 4)); }
  return out;
}

/* ----- which foods are allowed ----- */
function foodOK(fd) {
  var F = FS(), no = (DIETS[F.diet] || DIETS.any).no.concat(F.avoid || []);
  if (F.never.indexOf(fd.id) >= 0) return false;
  if (no.indexOf('spicy') >= 0 && fd.r.indexOf('spicy') >= 0) return false;
  for (var i = 0; i < fd.x.length; i++) if (no.indexOf(fd.x[i]) >= 0) return false;
  if (F.diet === 'keto' && (fd.cat === 'carb' || fd.r.indexOf('legume') >= 0 || fd.r.indexOf('sweet') >= 0 || fd.id === 'corn' || fd.id === 'peas' || fd.id === 'bar')) return false;
  return true;
}
function foodPool(role) {
  var F = FS(), have = F.have, useHave = F.onlyHave && have.length >= 4;
  return FOODS.filter(function (fd) { return fd.r.indexOf(role) >= 0 && foodOK(fd) && (!useHave || have.indexOf(fd.id) >= 0); });
}

/* ----- meal templates -----
   slots: [key, role or [roles], kind] — kind: P main protein (sized for protein), C carb (fills calories), V veg (fixed), X extra (fixed), O optional extra */
var MEALT = [
  { id: 'scramble', m: 'b', cu: 'american', slots: [['p', 'egg', 'P'], ['v', 'veg', 'V'], ['c', ['bread', 'potato'], 'C'], ['o', 'cheese', 'O']], name: function (s) { return 'Egg scramble with ' + low(s.v) + (s.c ? ' and ' + carbWord(s.c) : ''); }, how: ['Sauté the {v} for 2–3 minutes.', 'Add the whisked eggs{?o: and %} and stir until just set.', '{?c:Serve with %.}'] },
  { id: 'omelet', m: 'b', cu: 'american', keto: 1, slots: [['p', 'egg', 'P'], ['v', 'veg', 'V'], ['x', ['cheese', 'avo'], 'X'], ['s', 'side', 'O']], name: function (s) { return low(s.v, 1) + ' omelette' + (s.x ? ' with ' + low(s.x) : ''); }, how: ['Cook the {v} first, then pour the eggs over.', 'Fold{?x: in the %} and serve{?s: with %}.'] },
  { id: 'yogbowl', m: 'bs', cu: 'american', slots: [['p', 'yog', 'P'], ['f', 'fruit', 'C'], ['t', 'topping', 'X']], name: function (s) { return low(s.p, 1) + ' bowl with ' + low(s.f) + j(' and ', s.t); }, how: ['Spoon the {p} into a bowl.', 'Top with {f}{?t: and %}.'] },
  { id: 'oats', m: 'b', cu: 'american', slots: [['c', 'oats', 'C'], ['m', 'milk', 'X'], ['f', 'fruit', 'V'], ['t', ['nutbutter', 'topping'], 'X'], ['p', 'shake', 'P']], name: function (s) { return (s.p ? 'Protein oats' : 'Oatmeal') + ' with ' + low(s.f) + j(' and ', s.t); }, how: ['Cook the oats with {?m:% or }water (2 minutes in the microwave), or soak overnight in the fridge.', '{?p:Stir in the protein powder after cooking.}', 'Top with {f}{?t: and %}.'] },
  { id: 'smoothie', m: 'bs', cu: 'american', slots: [['p', 'shake', 'P'], ['m', 'milk', 'X'], ['f', 'fruit', 'C'], ['t', ['nutbutter', 'oats'], 'O']], name: function (s) { return low(s.f, 1) + ' protein smoothie'; }, how: ['Blend everything with a handful of ice for 30 seconds.'] },
  { id: 'tofuscr', m: 'b', cu: 'american', slots: [['p', 'tofu', 'P'], ['v', 'veg', 'V'], ['c', 'bread', 'C']], name: function (s) { return 'Tofu scramble with ' + low(s.v) + ' and toast'; }, how: ['Crumble the tofu into a hot pan with the {v}.', 'Season with salt, pepper and a pinch of turmeric. Serve with {c}.'] },
  { id: 'avotoast', m: 'b', cu: 'american', slots: [['p', 'egg', 'P'], ['c', 'bread', 'C'], ['x', 'avo', 'X', 1]], name: function (s) { return 'Avocado toast with eggs'; }, how: ['Toast the {c} and mash the avocado on top.', 'Add the eggs, fried, poached or boiled.'] },
  { id: 'brekburrito', m: 'b', cu: 'mexican', slots: [['p', 'egg', 'P'], ['c', 'wrap', 'C'], ['x', 'cheese', 'O'], ['s', 'mexican', 'O'], ['v', 'veg', 'V']], name: function (s) { return 'Breakfast burrito with ' + low(s.v); }, how: ['Scramble the eggs with the {v}.', 'Wrap in the tortilla{?x: with %}{?s: and %}.'] },
  { id: 'custombf', m: 'b', cu: 'any', slots: [['p', 'cbf', 'P'], ['f', 'fruit', 'O']], name: function (s) { return low(s.p, 1) + j(' with ', s.f); }, how: [] },
  { id: 'bowl', m: 'ld', cu: 'any', slots: [['p', 'main', 'P'], ['c', 'grain', 'C'], ['v', 'veg', 'V'], ['v2', 'veg', 'V'], ['s', 'sauce', 'O'], ['o', 'oil', 'O']], name: function (s) { return low(s.p, 1) + ' bowl with ' + low(s.c) + (s.v2 ? ', ' + low(s.v) + ' and ' + low(s.v2) : ' and ' + low(s.v)); }, how: ['Cook the {c}.', 'Cook the {p}{?o: in %} and season with salt and pepper.', 'Roast or steam the {v}{?v2: and %}. Pile it all in a bowl{?s: and top with %}.'] },
  { id: 'plate', m: 'd', cu: 'american', slots: [['p', 'main', 'P'], ['c', 'potato', 'C'], ['v', 'veg', 'V'], ['o', 'oil', 'X']], name: function (s) { return low(s.p, 1) + ' with ' + low(s.c) + ' and ' + low(s.v); }, how: ['Bake the {c} at 425°F / 220°C for 25–35 minutes{?o: with a little %}.', 'Grill or pan-sear the {p}.', 'Steam or roast the {v}.'] },
  { id: 'stirfry', m: 'ld', cu: 'asian', slots: [['p', 'main', 'P'], ['c', 'grain', 'C'], ['v', 'veg', 'V'], ['v2', 'veg', 'V'], ['s', 'asian', 'X', 1], ['o', 'oil', 'X']], name: function (s) { return low(s.p, 1) + ' stir-fry with ' + low(s.v) + ' over ' + low(s.c); }, how: ['Cut the {p} into bite-size pieces and stir-fry{?o: in %} on high heat.', 'Add the {v}{?v2: and %} for 3–4 minutes{?s:, then the %}.', 'Serve over the {c}.'] },
  { id: 'pasta', m: 'ld', cu: 'italian', slots: [['p', 'main', 'P'], ['c', 'pasta', 'C'], ['v', 'veg', 'V'], ['s', 'italian', 'X', 1], ['x', 'parm', 'O']], name: function (s) { return low(s.c, 1) + ' with ' + low(s.p) + ', ' + low(s.v) + ' and ' + low(s.s); }, how: ['Boil the pasta.', 'Cook the {p} and {v} in a pan{?s:, then stir in the %}.', 'Toss with the pasta{?x: and top with %}.'] },
  { id: 'wrap', m: 'l', cu: 'american', slots: [['p', ['deli', 'main'], 'P'], ['c', 'wrap', 'C'], ['g', 'greens', 'V'], ['v', 'raw', 'V'], ['x', ['cheese', 'avo', 'dip'], 'X']], name: function (s) { return low(s.p, 1) + ' wrap with ' + low(s.v) + j(' and ', s.x); }, how: ['Lay out the {c}{?x: and spread on the %}.', 'Fill with {p}{?g:, %}{?v: and %}, then roll it up.'] },
  { id: 'sandwich', m: 'l', cu: 'american', slots: [['p', 'deli', 'P'], ['c', 'bread', 'C'], ['g', 'greens', 'V'], ['x', ['cheese', 'avo'], 'X']], name: function (s) { return low(s.p, 1) + ' sandwich' + j(' with ', s.x); }, how: ['Build it: {p}{?x:, %}{?g: and %} on the {c}.'] },
  { id: 'salad', m: 'ld', cu: 'med', keto: 1, slots: [['g', 'greens', 'V'], ['p', 'main', 'P'], ['v', 'raw', 'V'], ['x', ['cheese', 'avo', 'nuts'], 'X'], ['o', 'dress', 'X'], ['c', ['grain', 'legume'], 'C']], name: function (s) { return 'Big ' + low(s.p) + ' salad' + j(' with ', s.v) + j(' and ', s.x); }, how: ['Cook the {p} (or use leftovers).', 'Toss {g}{?v:, %}{?c:, %}{?x: and %} with {?o:% and }lemon or vinegar, salt and pepper.'] },
  { id: 'tacos', m: 'ld', cu: 'mexican', slots: [['p', 'main', 'P'], ['c', 'taco', 'C'], ['v', 'veg', 'V'], ['s', 'mexican', 'X'], ['x', ['cheese', 'avo'], 'O']], name: function (s) { return low(s.p, 1) + ' tacos'; }, how: ['Season the {p} with chili powder, cumin and salt, then cook.', 'Warm the tortillas. Fill with {p}, {v}{?x:, %}{?s: and %}.'] },
  { id: 'medplate', m: 'ld', cu: 'med', slots: [['p', 'main', 'P'], ['c', ['grain', 'wrap'], 'C'], ['v', 'raw', 'V'], ['s', 'dip', 'X'], ['x', 'cheese', 'O']], name: function (s) { return 'Mediterranean ' + low(s.p) + ' plate' + j(' with ', s.s); }, how: ['Season the {p} with oregano, lemon and garlic, then cook.', 'Serve with {c}, chopped {v}{?x:, %}{?s: and %}.'] },
  { id: 'ketoplate', m: 'ld', cu: 'american', keto: 1, slots: [['p', 'main', 'P'], ['v', 'green', 'V'], ['v2', 'lowcarb', 'V'], ['o', 'oil', 'X'], ['x', ['cheese', 'avo'], 'X']], name: function (s) { return low(s.p, 1) + ' with roasted ' + low(s.v) + j(' and ', s.v2); }, how: ['Sear the {p}.', 'Roast the {v}{?v2: and %}{?o: with %}.{?x: Add % on the side.}'] },
  { id: 'fruitnuts', m: 's', cu: 'any', slots: [['f', 'fruit', 'C'], ['t', ['nuts', 'nutbutter'], 'X']], name: function (s) { return low(s.f, 1) + j(' with ', s.t); }, how: [] },
  { id: 'shake', m: 's', cu: 'any', slots: [['p', 'shake', 'P'], ['m', 'milk', 'X'], ['f', 'fruit', 'O']], name: function (s) { return 'Protein shake' + (s.f ? ' + ' + low(s.f) : ''); }, how: ['Shake or blend{?m: with the %}.'] },
  { id: 'cakes', m: 's', cu: 'any', slots: [['c', 'crisp', 'C'], ['t', 'nutbutter', 'X'], ['f', 'fruit', 'O']], name: function (s) { return 'Rice cakes' + j(' with ', s.t) + j(' and ', s.f); }, how: [] },
  { id: 'snackp', m: 's', cu: 'any', slots: [['p', 'snackP', 'P'], ['f', 'fruit', 'C']], name: function (s) { return low(s.p, 1) + ' + ' + low(s.f); }, how: [] },
  { id: 'veghum', m: 's', cu: 'med', slots: [['v', 'raw', 'V'], ['s', 'dip', 'X'], ['c', ['wrap', 'crisp'], 'C']], name: function (s) { return low(s.v, 1) + j(' with ', s.s); }, how: [] },
  { id: 'eggsnack', m: 's', cu: 'any', keto: 1, slots: [['p', 'egg', 'P'], ['x', ['cheese', 'nuts'], 'X']], name: function (s) { return 'Hard-boiled eggs' + j(' + ', s.x); }, how: [] }
];
function j(pre, fd) { return fd ? pre + low(fd) : ''; }
function low(fd, cap) { if (!fd) return ''; var n = fd.n.replace(/ \(.*\)$/, '').replace(/^Canned /, '').replace(/ slices$/, '').replace(/ \/ .*$/, ''); n = n.charAt(0).toLowerCase() + n.slice(1); n = n.replace(/^greek/, 'Greek'); return cap ? n.charAt(0).toUpperCase() + n.slice(1) : n; }
function carbWord(fd) { return fd.u === 'slice' ? low(fd) + ' toast' : low(fd); }
function pickOne(arr, avoidIds) { var a = arr.filter(function (f) { return avoidIds.indexOf(f.id) < 0; }); if (!a.length) a = arr; return a.length ? a[Math.floor(Math.random() * a.length)] : null; }

/* build one meal of type m aimed at kcal K and protein P */
function buildMeal(m, K, P, exclude) {
  var F = FS(), keto = F.diet === 'keto', cus = F.cuisines || [];
  var cands = MEALT.filter(function (t) { return t.m.indexOf(m) >= 0 && (!keto || t.keto || (t.m === 's' && t.id !== 'cakes')); });
  var weighted = []; cands.forEach(function (t) { var w = cus.length && cus.indexOf(t.cu) >= 0 ? 4 : 1; if (!keto && t.keto && t.m !== 's') w *= 0.4; if (exclude && exclude.indexOf(t.id) >= 0) w = 0.2; for (var i = 0; i < w * 5; i++) weighted.push(t); });
  var best = null, bestErr = 1e9;
  for (var tries = 0; tries < 40; tries++) {
    var t = weighted[Math.floor(Math.random() * weighted.length)]; if (!t) return null;
    var sel = {}, used = [], ok = true;
    t.slots.forEach(function (sl) {
      if (!ok) return;
      var roles = [].concat(sl[1]), pool = [];
      roles.forEach(function (r) { foodPool(r).forEach(function (f) { if (pool.indexOf(f) < 0) pool.push(f); }); });
      if (keto && sl[2] === 'C') return;                                  // no starch on keto
      if (F.simple && sl[2] === 'O') return;
      var f = pickOne(pool, used); if (f && used.indexOf(f.id) >= 0 && (sl[2] !== 'P' && sl[2] !== 'C' && sl[0] !== 'v')) f = null;
      if (!f && sl[3]) { ok = false; return; }
      if (!f) { if (sl[2] === 'O' || sl[2] === 'X' || (sl[2] === 'V' && sl[0] !== 'v')) return; ok = false; return; }
      sel[sl[0]] = f; used.push(f.id);
    });
    if (!ok) continue;
    var meal = sizeMeal(t, sel, K, P); if (!meal) continue;
    var err = Math.abs(meal.k - K) / K + Math.max(0, P - meal.p) / P * 0.7;
    if (err < bestErr) { best = meal; bestErr = err; }
    if (err < 0.12) break;
  }
  return best;
}
function roundTo(v, st) { return Math.round(v / st) * st; }
function sizeMeal(t, sel, K, P) {
  var items = [];
  t.slots.forEach(function (sl) { var f = sel[sl[0]]; if (f) items.push({ key: sl[0], kind: sl[2], f: f, q: 0 }); });
  function base(it) { var f = it.f; if (it.kind === 'P') return f.u === 'g' ? 120 : f.mn; if (it.kind === 'C') return f.u === 'g' ? f.mn * 1.5 : f.mn; if (it.kind === 'V') return f.u === 'g' ? (f.r.indexOf('greens') >= 0 ? 60 : 100) : 1; return f.mn; }
  items.forEach(function (it) { it.q = base(it); });
  function tot(k) { return items.reduce(function (a, it) { return a + it.f[k] * it.q; }, 0); }
  var Pi = items.filter(function (it) { return it.kind === 'P'; })[0], Ci = items.filter(function (it) { return it.kind === 'C'; })[0];
  for (var pass = 0; pass < 3; pass++) {
    if (Pi) { var otherP = tot('p') - Pi.f.p * Pi.q; Pi.q = Math.min(Pi.f.mx, Math.max(Pi.f.mn, roundTo((P - otherP) / Pi.f.p, Pi.f.st))); }
    if (Ci) { var otherK = tot('k') - Ci.f.k * Ci.q, cmx = Ci.f.u === 'g' ? Math.min(Ci.f.mx, Ci.f.mx * 0.75) : Ci.f.mx; Ci.q = Math.min(cmx, Math.max(Ci.f.mn, roundTo((K - otherK) / Ci.f.k, Ci.f.st))); if (Pi && pass === 2) { var room2 = K - tot('k'); if (room2 > 80) { var pcap = (P * 1.3 - (tot('p') - Pi.f.p * Pi.q)) / Pi.f.p; Pi.q = Math.max(Pi.q, Math.min(Pi.f.mx, pcap, roundTo(Pi.q + room2 / Pi.f.k, Pi.f.st))); Pi.q = roundTo(Pi.q, Pi.f.st); } } }
    else {
      // no carb slot (keto or protein snack): grow fats/extras toward calories
      var room = K - tot('k'), fx = items.filter(function (it) { return it.kind === 'X' && it.f.k > 20; })[0];
      if (fx && room > 60) fx.q = Math.min(fx.f.mx, Math.max(fx.f.mn, roundTo(fx.q + room / fx.f.k, fx.f.st)));
      else if (Pi && room > 80) { var pc = (P * 1.6 - (tot('p') - Pi.f.p * Pi.q)) / Pi.f.p; Pi.q = Math.max(Pi.q, roundTo(Math.min(Pi.f.mx, pc, Pi.q + room / Pi.f.k), Pi.f.st)); }
    }
  }
  var k = tot('k'), p = tot('p');
  if (k > K * 1.45 || k < K * 0.45) return null;
  return { t: t.id, n: t.name(sel), it: items.map(function (it) { return { id: it.f.id, q: it.q, key: it.key }; }), k: Math.round(k), p: Math.round(p), c: Math.round(tot('c')), f: Math.round(tot('f')) };
}
function mealHow(meal) {
  var t = MEALT.filter(function (x) { return x.id === meal.t; })[0]; if (!t) return [];
  var by = {}; meal.it.forEach(function (i) { by[i.key] = FOOD_BY[i.id]; });
  return t.how.map(function (h) {
    return h.replace(/\{\?(\w+):([^}]*)\}/g, function (_, k, txt) { return by[k] ? txt.replace('%', low(by[k])) : ''; })
      .replace(/\{(\w+)\}/g, function (_, k) { return by[k] ? low(by[k]) : ''; });
  }).filter(function (h) { return h.trim(); });
}
function qtyText(id, q) {
  var f = FOOD_BY[id]; if (!f) return '';
  if (f.custom) return (q === 1 ? '' : (q === 0.5 ? '½' : String(q).replace('.5', '½')) + ' × ') + f.u;
  if (f.u === 'g') { var oz = unit() === 'lb' && (f.cat === 'protein' || f.cat === 'carb') ? ' (' + (Math.round(q / 28.35 * 2) / 2) + ' oz)' : ''; return q + ' g' + oz; }
  var n = q === 0.5 ? '½' : q === 1.5 ? '1½' : String(q).replace('.5', '½');
  var u = f.u; if (q > 1 && u !== 'tbsp' && u !== 'tsp') u = u + 's';
  return n + ' ' + u;
}

function buildMealAny(m, K, P, ex) {
  var F = FS(), ml = buildMeal(m, K, P, ex);
  if (!ml && F.onlyHave && F.have.length >= 4) { F.onlyHave = false; try { ml = buildMeal(m, K, P, ex); } finally { F.onlyHave = true; } if (ml) ml.shop = 1; }
  return ml;
}
/* ----- plans: one per day (today and the coming week) ----- */
function dayAdd(dk, n) { var p = dk.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2] + n); return dayKey(d.getTime()); }
function planFor(dk, force) {
  var F = FS(), want = (MEALSETS[F.meals] || MEALSETS[4]).length, cur = F.days[dk];
  if (!force && cur && cur.meals && cur.meals.length === want) return cur;
  var T = foodTargets(), slots = MEALSETS[F.meals] || MEALSETS[4], split = MSPLIT[F.meals] || MSPLIT[4], used = [];
  // avoid repeating yesterday's ideas
  var y = F.days[dayAdd(dk, -1)]; if (y && y.meals) y.meals.forEach(function (x) { if (x.meal) used.push(x.meal.t); });
  var meals = slots.map(function (m) { var ml = buildMealAny(m, T.kcal * split[m], T.p * split[m], used); if (ml) used.push(ml.t); return { m: m, meal: ml }; });
  F.days[dk] = { d: dk, meals: meals };
  var today = dayKey(); Object.keys(F.days).forEach(function (k) { if (k < dayAdd(today, -1) || k > dayAdd(today, 13)) delete F.days[k]; });
  persist({ settings: true });
  return F.days[dk];
}
function planToday(force) { return planFor(dayKey(), force); }
function planWeek(force) { var t = dayKey(), out = []; for (var i = 0; i < 7; i++) out.push(planFor(dayAdd(t, i), force)); return out; }
function reshuffle(i, dk) {
  dk = dk || dayKey();
  var F = FS(), pl = planFor(dk), T = foodTargets(), split = MSPLIT[F.meals] || MSPLIT[4], slot = pl.meals[i]; if (!slot) return;
  var prev = slot.meal ? slot.meal.t : null, others = pl.meals.map(function (x) { return x.meal && x.meal.t; }).filter(Boolean);
  var best = null;
  for (var k = 0; k < 6 && !best; k++) { var ml = buildMealAny(slot.m, T.kcal * split[slot.m], T.p * split[slot.m], others); if (ml && (ml.t !== prev || k > 3)) best = ml; }
  slot.meal = best || slot.meal; persist({ settings: true });
}
function todayLog() { var F = FS(), dk = dayKey(); return F.log[dk] || []; }
function logAdd(entry) {
  var F = FS(), dk = dayKey(); (F.log[dk] = F.log[dk] || []).push(entry);
  var keys = Object.keys(F.log).sort(); while (keys.length > 21) delete F.log[keys.shift()];
  persist({ settings: true });
}
function eaten() { return todayLog().reduce(function (a, e) { a.k += e.k; a.p += e.p; a.c += e.c || 0; a.f += e.f || 0; return a; }, { k: 0, p: 0, c: 0, f: 0 }); }

/* ----- views ----- */
function barRow(label, v, tgt, unitTxt, cls) {
  var pct = tgt ? Math.min(100, v / tgt * 100) : 0, over = v > tgt * 1.05;
  return '<div class="mrow"><div class="row"><span class="grow">' + label + '</span><span class="num" style="font-size:17px">' + Math.round(v) + '<span class="faint"> / ' + Math.round(tgt) + unitTxt + '</span></span></div><div class="mbar ' + (cls || '') + (over ? ' over' : '') + '"><i style="width:' + pct.toFixed(1) + '%"></i></div></div>';
}
function viewEat() {
  var F = FS(), d = new Date(), head = '<div class="screen-head"><div><div class="sub">' + DOW[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate() + '</div><h1>Eat</h1></div>' + (F.setup ? '<button class="btn small ghost" data-act="eatGoals">Goals</button>' : '') + '</div>';
  if (!F.setup) return '<div class="screen">' + head + eatSetupCard() + '</div>';
  var T = foodTargets(), E = eaten(), left = T.kcal - E.k;
  var top = '<div class="card section" style="gap:12px"><div class="row" style="align-items:flex-end;gap:14px"><div class="num" style="font-size:56px;line-height:.85">' + Math.max(0, Math.round(left)) + '</div><div class="grow"><div class="xname">' + (left >= 0 ? 'calories left' : 'calories over') + '</div><div class="xmeta">' + Math.round(E.k) + ' eaten of ' + T.kcal + ' · ' + FGOALS[F.goal].n + '</div></div></div>' +
    barRow('Calories', E.k, T.kcal, '', 'k') + barRow('Protein', E.p, T.p, ' g', 'p') + barRow('Carbs', E.c, T.c, ' g', 'c') + barRow('Fat', E.f, T.f, ' g', 'f') + '</div>';
  var pl = planToday(), pantryN = F.have.length;
  var meals = pl.meals.map(function (s, i) { return mealCard(s, i); }).join('');
  var shop = shoppingList(pl);
  var logL = todayLog();
  var logHTML = '<div class="section"><div class="row"><h2 class="grow">Eaten today</h2><button class="btn small ghost" data-act="eatQuick">+ Add food</button></div>' +
    (logL.length ? '<div class="card" style="padding:0 14px">' + logL.map(function (e, i) { return '<div class="lrow"><span class="grow">' + esc(e.n) + '</span><span class="num" style="font-size:16px">' + Math.round(e.k) + ' kcal · ' + Math.round(e.p) + ' g P</span><button class="icon-btn" data-act="eatUnlog" data-i="' + i + '" aria-label="Remove ' + esc(e.n) + '">' + ico('x') + '</button></div>'; }).join('') + '</div>' : '<div class="note">Tap "I ate this" on a meal, or add any food.</div>') + '</div>';
  var foodsBtn = '<div class="card row" style="gap:12px"><div class="grow"><div class="xname">My foods</div><div class="xmeta">' + (pantryN ? pantryN + ' foods ticked' + (F.onlyHave && pantryN >= 4 ? ' · ideas use only these' : '') : 'Tick what you have and meal ideas will use it') + '</div></div><button class="btn small" data-act="eatFoods">' + (pantryN ? 'Edit' : 'Pick foods') + '</button></div>';
  var prefsBtn = '<div class="card row" style="gap:12px"><div class="grow"><div class="xname">Preferences</div><div class="xmeta">' + esc(prefSummary()) + '</div></div><button class="btn small" data-act="eatPrefs">Edit</button></div>';
  var seg = '<div class="seg" role="group" aria-label="Plan view"><button aria-pressed="' + (U.eatView !== 'week') + '" data-act="eatView" data-k="today">Today</button><button aria-pressed="' + (U.eatView === 'week') + '" data-act="eatView" data-k="week">This week</button></div>';
  var planPart = U.eatView === 'week' ? weekHTML() : '<div class="section"><div class="row"><h2 class="grow">Today\'s meals</h2><button class="btn small ghost" data-act="eatShuffleAll">' + ico('shuffle') + ' Shuffle all</button></div>' + meals + '</div>' + shop;
  return '<div class="screen">' + head + top + seg + planPart + logHTML + foodsBtn + prefsBtn +
    '<div class="note">Calories and protein are estimates from typical nutrition values and the Mifflin-St Jeor formula. Adjust them under Goals if your weight is not moving the way you want after 2–3 weeks.</div></div>';
}
function prefSummary() {
  var F = FS(), a = [(DIETS[F.diet] || DIETS.any).n];
  if (F.avoid.length) a.push('no ' + F.avoid.map(function (x) { return AVOID.filter(function (q) { return q[0] === x; })[0][1].toLowerCase(); }).join(', '));
  if (F.never.length) a.push(F.never.length + ' disliked');
  if (F.cuisines.length) a.push('likes ' + F.cuisines.map(function (x) { return CUISINES.filter(function (q) { return q[0] === x; })[0][1]; }).join(', '));
  if (F.simple) a.push('simple meals');
  a.push(F.meals + ' meals a day');
  return a.join(' · ');
}
function mealCard(s, i, dk) {
  dk = dk || dayKey(); var isToday = dk === dayKey(), dka = ' data-dk="' + dk + '"';
  var ml = s.meal, label = MEALN[s.m];
  if (!ml) return '<div class="card section meal"><div class="row"><div class="grow"><div class="mtag">' + label + '</div><div class="xname">No idea fits yet</div></div><button class="icon-btn" data-act="eatShuffle" data-i="' + i + '"' + dka + ' aria-label="Try again">' + ico('shuffle') + '</button></div><div class="note">Tick a few more foods under My foods, or loosen your preferences.</div></div>';
  var emo = ml.it.map(function (x) { return FOOD_BY[x.id] ? FOOD_BY[x.id].e : ''; }).join('');
  var lst = ml.it.map(function (x) { var f = FOOD_BY[x.id]; if (!f) return ''; var miss = FS().have.length && FS().have.indexOf(f.id) < 0; return '<li><span class="grow">' + f.e + ' ' + esc(f.n) + (miss ? ' <span class="tag">buy</span>' : '') + '</span><span class="faint">' + qtyText(f.id, x.q) + '</span></li>'; }).join('');
  var how = mealHow(ml), logged = isToday && !!todayLog().filter(function (e) { return e.mi === i && e.t === ml.t; }).length;
  return '<div class="card section meal"><div class="row" style="gap:10px;align-items:flex-start"><div class="grow"><div class="mtag">' + label + ' · ' + ml.k + ' kcal · ' + ml.p + ' g protein</div><div class="xname" style="font-size:18px">' + esc(ml.n) + '</div><div class="memo" aria-hidden="true">' + emo + '</div></div><button class="icon-btn" data-act="eatShuffle" data-i="' + i + '"' + dka + ' aria-label="Shuffle ' + label + '">' + ico('shuffle') + '</button></div>' +
    '<ul class="ings">' + lst + '</ul>' +
    (how.length ? '<details class="how"><summary>How to make it</summary><ol>' + how.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ol></details>' : '') +
    '<div class="row"><span class="xmeta grow">C ' + ml.c + ' g · F ' + ml.f + ' g</span>' + (isToday ? '<button class="btn small ' + (logged ? 'ghost' : 'primary') + '" data-act="eatLog" data-i="' + i + '"' + (logged ? ' disabled' : '') + '>' + (logged ? 'Logged ✓' : 'I ate this') + '</button>' : '') + '</div></div>';
}
function shoppingList(pl) {
  var F = FS(); if (!F.have.length) return '';
  var need = {}; pl.meals.forEach(function (s) { if (s.meal) s.meal.it.forEach(function (x) { if (F.have.indexOf(x.id) < 0) need[x.id] = 1; }); });
  var ids = Object.keys(need); if (!ids.length) return '';
  return '<div class="card section" style="gap:8px"><div class="xname">Shopping list</div><div class="note">Today\'s ideas use these and you have not ticked them.</div><div class="chips">' + ids.map(function (id) { var f = FOOD_BY[id]; return '<button class="chip" data-act="eatHave" data-id="' + id + '">' + f.e + ' ' + esc(f.n) + ' <span class="faint">+ got it</span></button>'; }).join('') + '</div></div>';
}
function eatSetupCard() {
  var F = FS(), B = profB();
  return '<div class="card section" style="gap:14px"><h2>Set up your eating plan</h2><div class="note">Tell it a little about you and it works out your calories and protein, then suggests meals from the foods you have.</div>' +
    (B ? '<div class="note">Using ' + esc(bodyText(B)) + ' · <button class="linkbtn accent" data-act="bodyEdit">edit</button></div>' : '<div class="banner"><span>Add your height, weight and sex first.</span><button class="btn small" data-act="bodyEdit">Add</button></div>') +
    eatGoalFields() + '<button class="btn primary block" data-act="eatStart"' + (B ? '' : ' disabled') + '>Make my plan</button></div>';
}
function eatGoalFields() {
  var F = FS();
  return '<div><span class="field-label">Goal</span><div class="chips">' + Object.keys(FGOALS).map(function (k) { return '<button class="chip" aria-pressed="' + (F.goal === k) + '" data-act="eatGoal" data-k="' + k + '">' + FGOALS[k].n + '</button>'; }).join('') + '</div><div class="note">' + FGOALS[F.goal].d + '</div></div>' +
    '<div class="row" style="gap:10px"><label class="grow"><span class="field-label">Age</span><input class="input" id="eat-age" inputmode="numeric" value="' + (F.age || '') + '" aria-label="Age"></label><label class="grow"><span class="field-label">Meals a day</span><select class="input" id="eat-meals">' + [3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (F.meals === n ? ' selected' : '') + '>' + n + (n === 3 ? ' (no snacks)' : n === 4 ? ' (1 snack)' : ' (2 snacks)') + '</option>'; }).join('') + '</select></label></div>' +
    '<div><span class="field-label">How active are you?</span><select class="input" id="eat-act">' + ACTS.map(function (a) { return '<option value="' + a[0] + '"' + (+F.act === a[0] ? ' selected' : '') + '>' + a[1] + '</option>'; }).join('') + '</select></div>' +
    '<div><span class="field-label">Diet style</span><div class="chips">' + Object.keys(DIETS).map(function (k) { return '<button class="chip" aria-pressed="' + (F.diet === k) + '" data-act="eatDiet" data-k="' + k + '">' + DIETS[k].n + '</button>'; }).join('') + '</div></div>';
}
function goalsSheet() {
  var F = FS(), T = foodTargets();
  U.eatSheet = goalsSheet;
  openSheet('Goals', eatGoalFields() +
    '<div class="card section" style="gap:6px"><div class="lrow"><span>Daily calories</span><span class="num" style="font-size:20px">' + T.kcal + '</span></div><div class="lrow"><span>Protein</span><span class="num" style="font-size:20px">' + T.p + ' g</span></div><div class="lrow"><span>Carbs · Fat</span><span class="num" style="font-size:20px">' + T.c + ' g · ' + T.f + ' g</span></div>' + (T.tdee ? '<div class="note">Maintenance is about ' + T.tdee + ' calories a day.</div>' : '') + '</div>' +
    '<div><span class="field-label">Set your own numbers (optional)</span><div class="row" style="gap:10px"><input class="input grow" id="eat-kcal" inputmode="numeric" placeholder="Calories" value="' + (F.kcal || '') + '" aria-label="Custom calories"><input class="input grow" id="eat-prot" inputmode="numeric" placeholder="Protein g" value="' + (F.prot || '') + '" aria-label="Custom protein"></div><div class="note">Leave blank to use the estimate.</div></div>' +
    '<button class="btn primary block" data-act="eatGoalsDone">Save and rebuild today\'s meals</button>');
}
function prefsSheet() {
  var F = FS();
  U.eatSheet = prefsSheet;
  openSheet('Preferences', '<div><span class="field-label">Diet style</span><div class="chips">' + Object.keys(DIETS).map(function (k) { return '<button class="chip" aria-pressed="' + (F.diet === k) + '" data-act="eatDiet" data-k="' + k + '">' + DIETS[k].n + '</button>'; }).join('') + '</div></div>' +
    '<div><span class="field-label">Never give me (allergies or dislikes)</span><div class="chips">' + AVOID.map(function (a) { return '<button class="chip" aria-pressed="' + (F.avoid.indexOf(a[0]) >= 0) + '" data-act="eatAvoid" data-k="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div></div>' +
    '<div><span class="field-label">Flavours I like</span><div class="chips">' + CUISINES.map(function (a) { return '<button class="chip" aria-pressed="' + (F.cuisines.indexOf(a[0]) >= 0) + '" data-act="eatCu" data-k="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div><div class="note">Ideas lean toward these. Leave empty for a mix.</div></div>' +
    '<div class="card row" style="gap:12px"><div class="grow"><div class="xname">Picky eater mode</div><div class="xmeta">Fewer ingredients, no optional extras</div></div><button class="chip" aria-pressed="' + !!F.simple + '" data-act="eatSimple">' + (F.simple ? 'On' : 'Off') + '</button></div>' +
    '<div class="card row" style="gap:12px"><div class="grow"><div class="xname">Only use foods I have</div><div class="xmeta">Needs at least 4 foods ticked</div></div><button class="chip" aria-pressed="' + !!F.onlyHave + '" data-act="eatOnly">' + (F.onlyHave ? 'On' : 'Off') + '</button></div>' +
    '<div class="note">To skip one food you dislike (say, mushrooms), open My foods and switch to "Never suggest".</div>' +
    '<button class="btn primary block" data-act="eatPrefsDone">Done</button>');
}
function foodsSheet() {
  var F = FS(), mode = U.eatMode || 'have', q = (U.eatQ || '').toLowerCase();
  U.eatSheet = foodsSheet;
  var body = '<div class="seg" role="group" aria-label="Mode"><button aria-pressed="' + (mode === 'have') + '" data-act="eatMode" data-k="have">I have</button><button aria-pressed="' + (mode === 'never') + '" data-act="eatMode" data-k="never">Never suggest</button></div>' +
    '<div class="note">' + (mode === 'have' ? 'Tick what is in your kitchen. Meal ideas are built from these.' : 'Tap foods you won\'t eat. They are never suggested.') + '</div>' +
    '<div class="row" style="gap:8px"><button class="btn small ghost grow" data-act="eatStaples">Tick common staples</button><button class="btn small ghost grow" data-act="eatClear">Clear</button></div>' +
    FOOD_CATS.map(function (c) {
      var list = FOODS.filter(function (f) { return f.cat === c[0] && !f.custom; });
      return '<div class="section" style="gap:8px"><h3 style="font-size:18px">' + c[1] + '</h3><div class="fgrid">' + list.map(function (f) {
        var on = mode === 'have' ? F.have.indexOf(f.id) >= 0 : F.never.indexOf(f.id) >= 0, dis = mode === 'have' && !foodOK(f);
        return '<button class="ftile' + (on ? ' on' : '') + (mode === 'never' ? ' nv' : '') + (dis ? ' dis' : '') + '" data-act="eatToggle" data-id="' + f.id + '" aria-pressed="' + on + '"><span class="fe">' + f.e + '</span><span class="fn">' + esc(f.n) + '</span></button>';
      }).join('') + '</div></div>';
    }).join('') + customSection() + '<button class="btn primary block" data-act="eatFoodsDone">Done</button>';
  openSheet('My foods', body);
}
var STAPLES = ['chicken', 'beef', 'egg', 'greekyog', 'tuna', 'whey', 'rice', 'oats', 'pasta', 'wwbread', 'tortilla', 'potato', 'banana', 'apple', 'berries', 'broccoli', 'spinach', 'pepper', 'onion', 'carrot', 'milk', 'cheddar', 'oil', 'butter', 'pb', 'almonds', 'salsa', 'soy', 'marinara'];
function quickSheet() {
  var F = FS(), q = (U.eatQ2 || '').toLowerCase();
  openSheet('Add food', '<input class="input" id="eatq" type="search" placeholder="Search foods" value="' + esc(U.eatQ2 || '') + '" aria-label="Search foods"><div id="eatqlist">' + quickList() + '</div>' +
    '<div class="section"><h3 style="font-size:18px">Or type it in</h3><input class="input" id="qa-n" placeholder="What did you eat?" aria-label="Food name"><div class="row" style="gap:10px"><input class="input grow" id="qa-k" inputmode="numeric" placeholder="Calories" aria-label="Calories"><input class="input grow" id="qa-p" inputmode="numeric" placeholder="Protein g" aria-label="Protein grams"></div><button class="btn block" data-act="eatQuickAdd">Add</button></div>');
}
function quickList() {
  var q = (U.eatQ2 || '').toLowerCase();
  var list = FOODS.filter(function (f) { return !q || f.n.toLowerCase().indexOf(q) >= 0; }).slice(0, q ? 30 : 12);
  return '<div class="card" style="padding:0 14px">' + list.map(function (f) {
    var q1 = f.u === 'g' ? (f.cat === 'protein' ? 150 : f.cat === 'carb' ? 150 : 100) : 1;
    return '<button class="lrow" style="width:100%;text-align:left" data-act="eatAddFood" data-id="' + f.id + '" data-q="' + q1 + '"><span class="grow">' + f.e + ' ' + esc(f.n) + ' <span class="faint">· ' + qtyText(f.id, q1) + '</span></span><span class="num" style="font-size:16px">' + Math.round(f.k * q1) + ' kcal</span></button>';
  }).join('') + '</div>';
}
function eatRefreshSheet() { if (U.eatSheet && sheetOpen()) { var b = $('#sheet-body'), y = b ? b.scrollTop : 0; U.eatSheet(); var b2 = $('#sheet-body'); if (b2) b2.scrollTop = y; } }

/* ----- events ----- */
function eatClick(a, d, el) {
  var F = FS();
  function tog(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }
  switch (a) {
    case 'eatView': U.eatView = d.k; if (d.k === 'week') planWeek(); render(); return true;
    case 'eatDay': daySheet(d.dk); return true;
    case 'eatShuffleDay': planFor(d.dk, true); if (sheetOpen()) eatRefreshSheet(); render(); return true;
    case 'eatShuffleWeek': planWeek(true); render(); toast('New ideas for the week'); return true;
    case 'eatGrocery': grocerySheet(); return true;
    case 'eatGot': { tog(F.have, d.id); if (F.have.indexOf(d.id) >= 0 && F.never.indexOf(d.id) >= 0) F.never.splice(F.never.indexOf(d.id), 1); persist({ settings: true }); var on = F.have.indexOf(d.id) >= 0; el.classList.toggle('got', on); el.setAttribute('aria-pressed', on); return true; }
    case 'eatGroceryCopy': copyText(groceryText()); return true;
    case 'eatGroceryDone': closeSheet(); render(); return true;
    case 'eatCustomNew': U.cf = { n: '', e: '', u: '1 serving', k: '', p: '', c: '', f: '', use: 'main', x: [] }; customSheet(); return true;
    case 'eatCustomEdit': { var cf = F.custom.filter(function (x) { return x.id === d.id; })[0]; if (cf) { U.cf = JSON.parse(JSON.stringify(cf)); customSheet(); } return true; }
    case 'eatCfUse': customRead(); U.cf.use = d.k; customSheet(); return true;
    case 'eatCfHas': customRead(); tog(U.cf.x, d.k); customSheet(); return true;
    case 'eatCfSave': { customRead(); var c = U.cf, er = $('#cf-err');
      if (!c.n.trim()) { if (er) er.textContent = 'Give it a name.'; return true; }
      if (!(+c.k >= 0) || c.k === '') { if (er) er.textContent = 'Enter the calories per serving.'; return true; }
      c.n = c.n.trim().slice(0, 40); c.u = (c.u || '1 serving').trim().slice(0, 24); c.k = Math.round(+c.k); c.p = Math.round(+c.p || 0); c.c = Math.round(+c.c || 0); c.f = Math.round(+c.f || 0);
      if (!c.id) { c.id = 'c_' + Date.now().toString(36); F.custom.push(c); if (F.have.indexOf(c.id) < 0) F.have.push(c.id); }
      else F.custom = F.custom.map(function (x) { return x.id === c.id ? c : x; });
      F.days = {}; persist({ settings: true }); syncCustom(F); U.cf = null; foodsSheet(); toast('Saved ' + c.n); return true; }
    case 'eatCfDel': { var id = U.cf && U.cf.id; F.custom = F.custom.filter(function (x) { return x.id !== id; }); F.have = F.have.filter(function (x) { return x !== id; }); F.days = {}; persist({ settings: true }); syncCustom(F); U.cf = null; foodsSheet(); toast('Deleted'); return true; }
    case 'eatCfBack': U.cf = null; foodsSheet(); return true;
    case 'eatStart': F.setup = true; F.days = {}; persist({ settings: true }); render(); window.scrollTo(0, 0); toast('Your plan is ready. Tick your foods to tailor the ideas.'); return true;
    case 'eatGoal': F.goal = d.k; persist({ settings: true }); if (sheetOpen()) eatRefreshSheet(); else render(); return true;
    case 'eatDiet': F.diet = d.k; F.days = {}; persist({ settings: true }); if (sheetOpen()) eatRefreshSheet(); else render(); return true;
    case 'eatAvoid': tog(F.avoid, d.k); F.days = {}; persist({ settings: true }); eatRefreshSheet(); return true;
    case 'eatCu': tog(F.cuisines, d.k); F.days = {}; persist({ settings: true }); eatRefreshSheet(); return true;
    case 'eatSimple': F.simple = !F.simple; F.days = {}; persist({ settings: true }); eatRefreshSheet(); return true;
    case 'eatOnly': F.onlyHave = !F.onlyHave; F.days = {}; persist({ settings: true }); eatRefreshSheet(); return true;
    case 'eatGoals': goalsSheet(); return true;
    case 'eatPrefs': prefsSheet(); return true;
    case 'eatFoods': foodsSheet(); return true;
    case 'eatGoalsDone': case 'eatPrefsDone': F.days = {}; closeSheet(); U.eatSheet = null; render(); return true;
    case 'eatFoodsDone': F.days = {}; persist({ settings: true }); closeSheet(); U.eatSheet = null; render(); return true;
    case 'eatMode': U.eatMode = d.k; eatRefreshSheet(); return true;
    case 'eatToggle': {
      var arr = (U.eatMode || 'have') === 'have' ? F.have : F.never; tog(arr, d.id);
      if (arr === F.never) { var hi = F.have.indexOf(d.id); if (hi >= 0 && F.never.indexOf(d.id) >= 0) F.have.splice(hi, 1); }
      persist({ settings: true });
      var on = arr.indexOf(d.id) >= 0; el.classList.toggle('on', on); el.setAttribute('aria-pressed', on);
      return true;
    }
    case 'eatStaples': STAPLES.forEach(function (id) { if (F.have.indexOf(id) < 0 && F.never.indexOf(id) < 0 && foodOK(FOOD_BY[id])) F.have.push(id); }); persist({ settings: true }); eatRefreshSheet(); return true;
    case 'eatClear': if ((U.eatMode || 'have') === 'have') F.have = []; else F.never = []; persist({ settings: true }); eatRefreshSheet(); return true;
    case 'eatHave': if (F.have.indexOf(d.id) < 0) F.have.push(d.id); persist({ settings: true }); render(); return true;
    case 'eatShuffle': reshuffle(+d.i, d.dk); if (U.eatSheet && sheetOpen()) eatRefreshSheet(); render(); return true;
    case 'eatShuffleAll': planToday(true); render(); toast('New ideas for today'); return true;
    case 'eatLog': { var s = planToday().meals[+d.i]; if (!s || !s.meal) return true; logAdd({ n: MEALN[s.m] + ': ' + s.meal.n, k: s.meal.k, p: s.meal.p, c: s.meal.c, f: s.meal.f, mi: +d.i, t: s.meal.t }); render(); toast('Logged ' + s.meal.k + ' kcal'); return true; }
    case 'eatUnlog': { var L = todayLog(); L.splice(+d.i, 1); persist({ settings: true }); render(); return true; }
    case 'eatQuick': U.eatSheet = null; quickSheet(); return true;
    case 'eatAddFood': { var f = FOOD_BY[d.id], q = +d.q; logAdd({ n: f.n + ' (' + qtyText(f.id, q) + ')', k: Math.round(f.k * q), p: Math.round(f.p * q), c: Math.round(f.c * q), f: Math.round(f.f * q) }); closeSheet(); render(); toast('Added ' + f.n); return true; }
    case 'eatQuickAdd': {
      var n = ($('#qa-n') || {}).value || 'Food', k = parseInt(($('#qa-k') || {}).value, 10), p = parseInt(($('#qa-p') || {}).value, 10) || 0;
      if (!(k > 0)) { toast('Enter the calories.'); return true; }
      logAdd({ n: n.slice(0, 40), k: k, p: p, c: 0, f: 0 }); closeSheet(); render(); toast('Added'); return true;
    }
  }
  return false;
}
function eatInput(t) {
  var F = FS();
  if (t.id === 'eat-age') { var v = parseInt(t.value, 10); if (v >= 13 && v <= 100) { F.age = v; persist({ settings: true }); } return true; }
  if (t.id === 'eat-kcal') { var k = parseInt(t.value, 10); F.kcal = k > 800 ? k : null; persist({ settings: true }); return true; }
  if (t.id === 'eat-prot') { var p = parseInt(t.value, 10); F.prot = p > 30 ? p : null; persist({ settings: true }); return true; }
  if (t.id === 'eatq') { U.eatQ2 = t.value; var l = $('#eatqlist'); if (l) l.innerHTML = quickList(); return true; }
  return false;
}
function eatChange(t) {
  var F = FS();
  if (t.id === 'eat-act') { F.act = +t.value; persist({ settings: true }); return true; }
  if (t.id === 'eat-meals') { F.meals = +t.value; F.days = {}; persist({ settings: true }); return true; }
  return false;
}

/* ----- week view ----- */
function weekHTML() {
  var F = FS(), days = planWeek(), T = foodTargets();
  var cards = days.map(function (pl, di) {
    var dt = new Date(pl.d + 'T12:00:00'), lbl = di === 0 ? 'Today' : di === 1 ? 'Tomorrow' : DOW[dt.getDay()];
    var k = 0, p = 0; pl.meals.forEach(function (s) { if (s.meal) { k += s.meal.k; p += s.meal.p; } });
    return '<div class="card section wday"><div class="row"><button class="grow" style="text-align:left" data-act="eatDay" data-dk="' + pl.d + '"><div class="xname">' + lbl + ' <span class="faint" style="font-weight:500">' + MON[dt.getMonth()] + ' ' + dt.getDate() + '</span></div><div class="xmeta">' + k + ' kcal · ' + p + ' g protein</div></button><button class="icon-btn" data-act="eatShuffleDay" data-dk="' + pl.d + '" aria-label="Shuffle ' + lbl + '">' + ico('shuffle') + '</button></div>' +
      pl.meals.map(function (s) { return '<button class="wmeal" data-act="eatDay" data-dk="' + pl.d + '"><span class="mtag">' + MEALN[s.m] + '</span><span class="grow">' + (s.meal ? esc(s.meal.n) : 'No idea fits') + '</span><span class="faint">' + (s.meal ? s.meal.k : '') + '</span></button>'; }).join('') + '</div>';
  }).join('');
  return '<div class="section"><div class="row"><h2 class="grow">Next 7 days</h2><button class="btn small ghost" data-act="eatShuffleWeek">' + ico('shuffle') + ' Shuffle week</button></div>' +
    '<button class="btn primary block" data-act="eatGrocery">Grocery list for the week</button>' + cards + '</div>';
}
function daySheet(dk) {
  var pl = planFor(dk), dt = new Date(dk + 'T12:00:00');
  U.eatSheet = function () { daySheet(dk); };
  openSheet(DOW[dt.getDay()] + ', ' + MON[dt.getMonth()] + ' ' + dt.getDate(), pl.meals.map(function (s, i) { return mealCard(s, i, dk); }).join('') + '<button class="btn block" data-act="eatShuffleDay" data-dk="' + dk + '">' + ico('shuffle') + ' Shuffle this day</button>');
}
function groceryItems() {
  var days = planWeek(), tot = {};
  days.forEach(function (pl) { pl.meals.forEach(function (s) { if (s.meal) s.meal.it.forEach(function (x) { tot[x.id] = (tot[x.id] || 0) + x.q; }); }); });
  return Object.keys(tot).filter(function (id) { return FOOD_BY[id]; }).map(function (id) { return { id: id, q: Math.round(tot[id] * 100) / 100, f: FOOD_BY[id] }; })
    .sort(function (a, b) { var ca = FOOD_CATS.map(function (c) { return c[0]; }); return ca.indexOf(a.f.cat) - ca.indexOf(b.f.cat) || a.f.n.localeCompare(b.f.n); });
}
function groceryQty(it) {
  var f = it.f, q = it.q;
  if (f.u === 'g') { if (unit() === 'lb') { var lb = q / 453.6; return lb >= 1 ? (Math.round(lb * 10) / 10) + ' lb' : Math.round(q / 28.35) + ' oz'; } return q >= 1000 ? (Math.round(q / 100) / 10) + ' kg' : Math.round(q) + ' g'; }
  return qtyText(f.id, Math.ceil(q * 2) / 2);
}
function groceryText() {
  var F = FS(), its = groceryItems().filter(function (it) { return F.have.indexOf(it.id) < 0; });
  return 'Grocery list (next 7 days)\n' + (its.length ? its.map(function (it) { return '- ' + it.f.n + ': ' + groceryQty(it); }).join('\n') : 'Nothing to buy.');
}
function grocerySheet() {
  var F = FS(), its = groceryItems(), need = its.filter(function (it) { return F.have.indexOf(it.id) < 0; }), have = its.filter(function (it) { return F.have.indexOf(it.id) >= 0; }), haveIds = have.map(function (it) { return it.id; });
  function row(it) { var on = F.have.indexOf(it.id) >= 0; return '<button class="gro' + (on ? ' got' : '') + (haveIds.indexOf(it.id) >= 0 ? ' have' : '') + '" data-act="eatGot" data-id="' + it.id + '" aria-pressed="' + on + '"><span class="gbox">' + ico('check') + '</span><span class="grow">' + it.f.e + ' ' + esc(it.f.n) + '</span><span class="faint">' + groceryQty(it) + '</span></button>'; }
  U.eatSheet = grocerySheet;
  openSheet('Grocery list', '<div class="note">Totals for the next 7 days of meal ideas. Tick items as you buy them, and they are added to My foods.</div>' +
    (need.length ? '<div class="section" style="gap:4px"><h3 style="font-size:18px">To buy</h3>' + need.map(row).join('') + '</div>' : '<div class="note"><b>You have everything.</b></div>') +
    (have.length ? '<div class="section" style="gap:4px"><h3 style="font-size:18px">Already have (check you have enough)</h3>' + have.map(row).join('') + '</div>' : '') +
    '<div class="row"><button class="btn grow" data-act="eatGroceryCopy">Copy list</button><button class="btn primary grow" data-act="eatGroceryDone">Done</button></div>');
}

/* ----- your own foods ----- */
function customSection() {
  var F = FS();
  return '<div class="section" style="gap:8px"><h3 style="font-size:18px">Your own foods</h3><div class="note">Add things you eat often, like your protein pancakes or a favourite takeout order. Tap one to edit it.</div>' +
    (F.custom.length ? '<div class="fgrid">' + F.custom.map(function (c) { var on = (U.eatMode || 'have') === 'have' ? F.have.indexOf(c.id) >= 0 : F.never.indexOf(c.id) >= 0; return '<button class="ftile' + (on ? ' on' : '') + '" data-act="eatCustomEdit" data-id="' + c.id + '"><span class="fe">' + esc(c.e || '🍽️') + '</span><span class="fn">' + esc(c.n) + '</span><span class="faint" style="font-size:11.5px">' + c.k + ' kcal · ' + c.p + ' g P</span></button>'; }).join('') + '</div>' : '') +
    '<button class="btn block" data-act="eatCustomNew">+ Add your own food</button></div>';
}
function customRead() {
  var c = U.cf; if (!c) return;
  ['n', 'e', 'u', 'k', 'p', 'c', 'f'].forEach(function (k) { var el = $('#cf-' + k); if (el) c[k] = el.value; });
}
function customSheet() {
  var c = U.cf; U.eatSheet = null;
  function inp(k, ph, mode, lbl) { return '<label class="grow"><span class="field-label">' + lbl + '</span><input class="input" id="cf-' + k + '"' + (mode ? ' inputmode="' + mode + '"' : '') + ' placeholder="' + ph + '" value="' + esc(String(c[k] == null ? '' : c[k])) + '"></label>'; }
  openSheet(c.id ? 'Edit food' : 'Add your own food',
    '<div class="row" style="gap:10px">' + inp('n', 'e.g. Protein pancakes', '', 'Name') + '<label style="width:76px"><span class="field-label">Emoji</span><input class="input" id="cf-e" maxlength="4" placeholder="🥞" value="' + esc(c.e || '') + '" style="text-align:center"></label></div>' +
    inp('u', '1 serving, 1 cup, 3 pancakes…', '', 'One serving is') +
    '<div class="row" style="gap:10px">' + inp('k', '0', 'numeric', 'Calories') + inp('p', '0', 'numeric', 'Protein g') + '</div>' +
    '<div class="row" style="gap:10px">' + inp('c', '0', 'numeric', 'Carbs g') + inp('f', '0', 'numeric', 'Fat g') + '</div>' +
    '<div><span class="field-label">Use it in meal ideas as</span><div class="chips">' + CUSTOM_USE.map(function (u) { return '<button class="chip" aria-pressed="' + (c.use === u[0]) + '" data-act="eatCfUse" data-k="' + u[0] + '">' + u[1] + '</button>'; }).join('') + '</div></div>' +
    '<div><span class="field-label">Contains (so diet and allergy filters work)</span><div class="chips">' + CUSTOM_HAS.map(function (u) { return '<button class="chip" aria-pressed="' + (c.x.indexOf(u[0]) >= 0) + '" data-act="eatCfHas" data-k="' + u[0] + '">' + u[1] + '</button>'; }).join('') + '</div></div>' +
    '<div class="note" id="cf-err" style="color:var(--down);min-height:0"></div>' +
    '<div class="row"><button class="btn grow" data-act="eatCfBack">Back</button><button class="btn primary grow" data-act="eatCfSave">Save</button></div>' +
    (c.id ? '<button class="btn block ghost danger" data-act="eatCfDel">Delete this food</button>' : ''));
}
