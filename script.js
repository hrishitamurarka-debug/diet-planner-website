// ===== SAVE AND LOAD DATA IN THE BROWSER =====
function load(key, fallback) {
  try {
    var data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

function dateStr(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function today() {
  return dateStr(new Date());
}

function yesterday() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  return dateStr(d);
}

// ===== PAGE SWITCHING =====
var pages = document.querySelectorAll(".page");
var tabs = document.querySelectorAll(".tab");

function showPage(name) {
  pages.forEach(function (p) {
    p.hidden = (p.id !== "page-" + name);
  });
  tabs.forEach(function (t) {
    t.classList.toggle("active", t.dataset.page === name);
  });
  if (name === "rewards") renderRewards();
  window.scrollTo(0, 0);
}

tabs.forEach(function (t) {
  t.addEventListener("click", function () {
    showPage(t.dataset.page);
  });
});

// ===== POP-UP MESSAGE AND CONFETTI =====
var toastTimer;

function toast(message) {
  var t = document.getElementById("toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    t.classList.remove("show");
  }, 3200);
}

function confetti() {
  var box = document.getElementById("confetti");
  var icons = ["🎉", "⭐", "🍎", "💧", "✨"];
  for (var i = 0; i < 24; i++) {
    var s = document.createElement("span");
    s.textContent = icons[i % icons.length];
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDelay = Math.random() * 0.5 + "s";
    box.appendChild(s);
  }
  setTimeout(function () {
    box.innerHTML = "";
  }, 2800);
}

// ===== REWARDS: POINTS, LEVELS, STREAK, BADGES =====
var levelNames = ["Seedling", "Sprout", "Fresh Starter", "Green Hero", "Wellness Champion", "Health Legend"];

var badgeList = [
  { id: "plan", icon: "🥗", name: "First Plan", text: "Create a meal plan" },
  { id: "water", icon: "💧", name: "Hydration Hero", text: "Reach your water goal" },
  { id: "weight", icon: "⚖", name: "Weight Watcher", text: "Log your weight 3 times" },
  { id: "meals", icon: "🍽", name: "Meal Master", text: "Follow all 4 meals in a day" },
  { id: "streak3", icon: "🔥", name: "On Fire", text: "Reach a 3-day streak" },
  { id: "points300", icon: "🏆", name: "Point Collector", text: "Earn 300 points" }
];

function getRewards() {
  var r = load("rewards", {
    points: 0, streak: 0, lastActive: "", badges: {},
    day: "", plan: false, goal: false, weight: false, meals: [false, false, false, false]
  });
  // New day: reset the daily quests
  if (r.day !== today()) {
    r.day = today();
    r.plan = false;
    r.goal = false;
    r.weight = false;
    r.meals = [false, false, false, false];
  }
  return r;
}

function addPoints(r, n, reason) {
  var oldLevel = Math.floor(r.points / 100);
  r.points += n;

  // Streak: days in a row with any activity
  if (r.lastActive !== today()) {
    r.streak = (r.lastActive === yesterday()) ? r.streak + 1 : 1;
    r.lastActive = today();
  }

  var messages = ["+" + n + " points: " + reason];
  var celebrate = false;

  if (Math.floor(r.points / 100) > oldLevel) {
    messages.push("Level up!");
    celebrate = true;
  }

  // Check for new badges
  var log = load("weightLog", []);
  var earned = {
    plan: r.plan,
    water: r.goal,
    weight: log.length >= 3,
    meals: r.meals.every(Boolean),
    streak3: r.streak >= 3,
    points300: r.points >= 300
  };
  badgeList.forEach(function (b) {
    if (earned[b.id] && !r.badges[b.id]) {
      r.badges[b.id] = true;
      messages.push("Badge unlocked: " + b.name);
      celebrate = true;
    }
  });

  save("rewards", r);
  toast(messages.join(" - "));
  if (celebrate) confetti();
  renderRewards();
}

function renderRewards() {
  var r = getRewards();
  var level = Math.floor(r.points / 100);
  var shownStreak = (r.lastActive === today() || r.lastActive === yesterday()) ? r.streak : 0;

  document.getElementById("hPoints").textContent = r.points;
  document.getElementById("hStreak").textContent = shownStreak;
  document.getElementById("levelNum").textContent = level + 1;
  document.getElementById("levelName").textContent = levelNames[Math.min(level, levelNames.length - 1)];
  document.getElementById("levelFill").style.width = (r.points % 100) + "%";
  document.getElementById("pointsTotal").textContent = r.points;
  document.getElementById("toNext").textContent = 100 - (r.points % 100);
  document.getElementById("streakNum").textContent = shownStreak;

  document.getElementById("q-plan").classList.toggle("done", r.plan);
  document.getElementById("q-goal").classList.toggle("done", r.goal);
  document.getElementById("q-weight").classList.toggle("done", r.weight);

  document.querySelectorAll(".mealCheck").forEach(function (box) {
    var done = r.meals[parseInt(box.dataset.i)];
    box.checked = done;
    box.disabled = done;
  });

  var grid = document.getElementById("badgeGrid");
  grid.innerHTML = "";
  badgeList.forEach(function (b) {
    var div = document.createElement("div");
    div.className = "badge" + (r.badges[b.id] ? "" : " locked");
    div.innerHTML = '<div class="b-icon">' + b.icon + "</div><strong>" + b.name + "</strong><small>" + b.text + "</small>";
    grid.appendChild(div);
  });
}

document.querySelectorAll(".mealCheck").forEach(function (box) {
  box.addEventListener("change", function () {
    var r = getRewards();
    var i = parseInt(box.dataset.i);
    if (box.checked && !r.meals[i]) {
      r.meals[i] = true;
      addPoints(r, 10, "meal followed");
    }
  });
});

document.getElementById("resetRewards").addEventListener("click", function () {
  if (confirm("Reset all points, streak and badges?")) {
    try { localStorage.removeItem("rewards"); } catch (e) {}
    renderRewards();
  }
});

// ===== PLANNER: BMI, CALORIES, 7-DAY MEALS =====
var meals = {
  veg: {
    Breakfast: ["Oats with banana and nuts", "Vegetable poha", "Paneer sandwich", "Moong dal chilla", "Idli with sambar"],
    Lunch: ["2 rotis, dal and sabzi", "Rajma with rice", "Vegetable khichdi with curd", "Chole with 1 roti", "Paneer bhurji with 2 rotis"],
    Snack: ["Roasted chana", "Fruit and almonds", "Sprouts salad", "Buttermilk", "Curd with fruit"],
    Dinner: ["Vegetable soup and 2 rotis", "Grilled paneer with salad", "Dal with sauteed vegetables", "Tofu stir-fry", "Vegetable daliya"]
  },
  nonveg: {
    Breakfast: ["Boiled eggs and toast", "Egg bhurji with 2 rotis", "Vegetable omelette", "Oats with milk", "Poha with a boiled egg"],
    Lunch: ["Grilled chicken with rice", "Fish curry with rice", "Egg curry with 2 rotis", "Chicken stir-fry with vegetables", "Dal, 2 rotis and egg bhurji"],
    Snack: ["Boiled egg", "Roasted chana", "Fruit and nuts", "Chicken tikka", "Buttermilk and sprouts"],
    Dinner: ["Grilled fish with vegetables", "Chicken soup and 2 rotis", "Tandoori chicken with salad", "Dal with a boiled egg", "Chicken stew with vegetables"]
  }
};

var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
var currentDiet = "veg";
var currentCalories = 0;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function showMeals() {
  var body = document.getElementById("weekBody");
  body.innerHTML = "";
  var m = meals[currentDiet];
  for (var i = 0; i < days.length; i++) {
    var row = document.createElement("tr");
    row.innerHTML = "<th>" + days[i] + "</th><td>" + pick(m.Breakfast) + "</td><td>" + pick(m.Lunch) +
      "</td><td>" + pick(m.Snack) + "</td><td>" + pick(m.Dinner) + "</td>";
    body.appendChild(row);
  }
  var c = currentCalories;
  document.getElementById("split").textContent =
    "Aim for about " + Math.round(c * 0.25) + " kcal at breakfast, " + Math.round(c * 0.35) + " at lunch, " +
    Math.round(c * 0.10) + " as a snack and " + Math.round(c * 0.30) + " at dinner.";
}

document.getElementById("newMeals").addEventListener("click", showMeals);

document.getElementById("planForm").addEventListener("submit", function (event) {
  event.preventDefault();

  var age = parseFloat(document.getElementById("age").value);
  var weight = parseFloat(document.getElementById("weight").value);
  var height = parseFloat(document.getElementById("height").value);
  var gender = document.getElementById("gender").value;
  var activity = parseFloat(document.getElementById("activity").value);
  var goal = document.getElementById("goal").value;
  currentDiet = document.getElementById("diet").value;

  if (!age || !weight || !height || age < 10 || age > 100 || weight < 20 || weight > 300 || height < 100 || height > 250) {
    document.getElementById("error").textContent = "Please enter realistic values: height in cm (100-250), weight in kg (20-300), age 10-100.";
    document.getElementById("results").hidden = true;
    document.getElementById("weekCard").hidden = true;
    document.getElementById("empty").hidden = false;
    return;
  }
  document.getElementById("error").textContent = "";

  var bmi = weight / Math.pow(height / 100, 2);
  var bmiLabel = "Healthy weight";
  if (bmi < 18.5) bmiLabel = "Underweight";
  else if (bmi >= 25 && bmi < 30) bmiLabel = "Overweight";
  else if (bmi >= 30) bmiLabel = "Obese";

  var bmr = 10 * weight + 6.25 * height - 5 * age;
  bmr = (gender === "male") ? bmr + 5 : bmr - 161;
  var calories = bmr * activity;
  if (goal === "lose") calories = calories - 500;
  if (goal === "gain") calories = calories + 400;
  currentCalories = Math.round(calories);

  document.getElementById("bmi").textContent = bmi.toFixed(1);
  document.getElementById("bmiText").textContent = bmiLabel;
  document.getElementById("target").textContent = currentCalories;
  document.getElementById("empty").hidden = true;
  document.getElementById("results").hidden = false;
  document.getElementById("weekCard").hidden = false;
  showMeals();

  // Remember the weight so the Water page can set a personal goal
  save("profile", { weight: weight, calories: currentCalories });
  updateWaterGoal();

  // Reward: once a day
  var r = getRewards();
  if (!r.plan) {
    r.plan = true;
    addPoints(r, 20, "meal plan created");
  }
});

// ===== WATER TRACKER =====
var waterGoal = 2500;

function updateWaterGoal() {
  var profile = load("profile", null);
  var text = "Create a plan on the Planner page to get a personal goal. Default goal: 2500 ml.";
  waterGoal = 2500;
  if (profile) {
    waterGoal = Math.round(profile.weight * 35 / 100) * 100;
    text = "For your weight of " + profile.weight + " kg, aim for about " + waterGoal + " ml a day (a common guide is 35 ml per kg).";
  }
  document.getElementById("waterGoalText").textContent = text;
  document.getElementById("waterGoal").textContent = waterGoal;
  renderWater();
}

function renderWater() {
  var drunk = load("water-" + today(), 0);
  var percent = Math.min(100, Math.round(drunk / waterGoal * 100));
  document.getElementById("waterDrunk").textContent = drunk;
  document.getElementById("glasses").textContent = Math.round(drunk / 250 * 10) / 10;
  document.getElementById("waterFill").style.height = percent + "%";
  document.getElementById("waterPct").textContent = percent + "%";
}

function addWater(ml) {
  var total = load("water-" + today(), 0) + ml;
  save("water-" + today(), total);
  renderWater();

  var r = getRewards();
  var points = Math.round(ml / 50);
  if (total >= waterGoal && !r.goal) {
    r.goal = true;
    addPoints(r, points + 30, "water goal reached!");
  } else {
    addPoints(r, points, "stay hydrated");
  }
}

document.getElementById("addGlass").addEventListener("click", function () { addWater(250); });
document.getElementById("addBottle").addEventListener("click", function () { addWater(500); });
document.getElementById("resetWater").addEventListener("click", function () {
  save("water-" + today(), 0);
  renderWater();
});

// ===== WEIGHT PROGRESS TRACKER =====
function renderLog() {
  var log = load("weightLog", []);
  var body = document.getElementById("logBody");
  var chart = document.getElementById("chart");
  body.innerHTML = "";
  chart.innerHTML = "";

  if (log.length === 0) {
    document.getElementById("changeSummary").textContent = "No entries yet. Save your first weight above.";
    return;
  }

  for (var i = 0; i < log.length; i++) {
    var change = "-";
    if (i > 0) {
      var diff = log[i].weight - log[i - 1].weight;
      change = (diff > 0 ? "+" : "") + diff.toFixed(1);
    }
    var row = document.createElement("tr");
    row.innerHTML = "<td>" + log[i].date + "</td><td>" + log[i].weight + "</td><td>" + change + "</td>";
    body.appendChild(row);
  }

  var start = log[0].weight;
  var latest = log[log.length - 1].weight;
  var total = latest - start;
  var word = total < 0 ? "lost" : "gained";
  document.getElementById("changeSummary").textContent =
    "Start: " + start + " kg. Latest: " + latest + " kg. You have " + word + " " + Math.abs(total).toFixed(1) + " kg.";

  var recent = log.slice(-10);
  var weights = recent.map(function (e) { return e.weight; });
  var min = Math.min.apply(null, weights) - 1;
  var max = Math.max.apply(null, weights) + 1;
  recent.forEach(function (entry) {
    var h = (entry.weight - min) / (max - min) * 75 + 10;
    var col = document.createElement("div");
    col.className = "bar-col";
    col.innerHTML = '<div class="bar-fill" style="height:' + h + '%"></div><span>' + entry.weight + "</span>";
    chart.appendChild(col);
  });
}

document.getElementById("saveWeight").addEventListener("click", function () {
  var w = parseFloat(document.getElementById("logWeight").value);
  var error = document.getElementById("logError");
  if (!w || w < 20 || w > 300) {
    error.textContent = "Enter a weight between 20 and 300 kg.";
    return;
  }
  error.textContent = "";

  var log = load("weightLog", []);
  var existing = log.find(function (e) { return e.date === today(); });
  if (existing) {
    existing.weight = w;
  } else {
    log.push({ date: today(), weight: w });
  }
  log.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  save("weightLog", log);
  document.getElementById("logWeight").value = "";
  renderLog();

  // Reward: once a day
  var r = getRewards();
  if (!r.weight) {
    r.weight = true;
    addPoints(r, 15, "weight logged");
  }
});

document.getElementById("clearLog").addEventListener("click", function () {
  if (confirm("Delete all weight entries?")) {
    save("weightLog", []);
    renderLog();
  }
});

// ===== CONTACT FORM =====
var contactEmail = "hrishitamurarka@gmail.com";

document.getElementById("contactForm").addEventListener("submit", function (event) {
  event.preventDefault();

  var name = document.getElementById("cName").value.trim();
  var email = document.getElementById("cEmail").value.trim();
  var message = document.getElementById("cMessage").value.trim();
  var note = document.getElementById("contactMsg");

  if (!name || !email || !message) {
    note.className = "error";
    note.textContent = "Please fill in your name, email and message.";
    return;
  }
  if (email.indexOf("@") === -1 || email.indexOf(".") === -1) {
    note.className = "error";
    note.textContent = "Please enter a valid email address.";
    return;
  }

  var subject = "PlatePlan message from " + name;
  var body = message + "\n\nFrom: " + name + " (" + email + ")";
  window.location.href = "mailto:" + contactEmail +
    "?subject=" + encodeURIComponent(subject) +
    "&body=" + encodeURIComponent(body);

  note.className = "success";
  note.textContent = "Thank you, " + name + "! Your email app will open so you can send the message.";
  document.getElementById("contactForm").reset();
});

// ===== DAILY QUOTE AND START =====
var quotes = [
  "Small steps every day add up.",
  "Progress, not perfection.",
  "Drink water. Eat colorful. Rest well.",
  "Consistency beats intensity.",
  "One healthy meal at a time.",
  "Today is a good day to start.",
  "You do not have to be perfect, just keep going."
];
document.getElementById("quote").textContent = "💬 " + quotes[new Date().getDay()];

updateWaterGoal();
renderLog();
renderRewards();