// === CONFIG ===
const PEOPLE = ["Sujay", "Joy", "Rohan", "Rhea"];
let apiToken = localStorage.getItem("todoistToken") || "";
let showAll = false;
let selectedTask = null;
let choresProjectId = null;


async function ensureLabelExists(labelName) {
  const res = await fetch("https://api.todoist.com/rest/v2/labels", {
    headers: { Authorization: `Bearer ${apiToken}` }
  });
  const labels = await res.json();

  // check if label exists
  let label = labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());
  if (label) return label.name;

  // create label if missing
  const createRes = await fetch("https://api.todoist.com/rest/v2/labels", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: labelName })
  });
  const newLabel = await createRes.json();
  return newLabel.name;
}


function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent =
    now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/New_York"
    });
}


setInterval(updateClock, 1000);
updateClock();

// === SETTINGS ===
function openSettings() {
  document.getElementById("settingsPanel").style.display = "flex";
}
function closeSettings() {
  document.getElementById("settingsPanel").style.display = "none";
}
function saveSettings() {
  apiToken = document.getElementById("tokenInput").value.trim();
  localStorage.setItem("todoistToken", apiToken);
  closeSettings();
  init();
}
document.getElementById("tokenInput").value = apiToken;

// === TOGGLE VIEW ===
function toggleView() {
  showAll = !showAll;
  document.getElementById("viewModeLabel").textContent =
    "View: " + (showAll ? "All Tasks" : "Today/Overdue");
  fetchTasks();
}

// === INIT: GET PROJECTS ===
async function init() {
  if (!apiToken) return;

  const res = await fetch("https://api.todoist.com/rest/v2/projects", {
    headers: { Authorization: `Bearer ${apiToken}` }
  });
  const projects = await res.json();
  const choresProject = projects.find(p => p.name.toLowerCase() === "chores");
  choresProjectId = choresProject ? choresProject.id : null;

  fetchTasks();
}

// === FETCH TASKS FROM "CHORES" ===
async function fetchTasks() {
  if (!apiToken || !choresProjectId) return;
  document.getElementById("loadingOverlay").style.display = "flex"; // show spinner
  const res = await fetch(`https://api.todoist.com/rest/v2/tasks?project_id=${choresProjectId}`, {
    headers: { Authorization: `Bearer ${apiToken}` }
  });
  let tasks = await res.json();

  if (!showAll) {
    const now = new Date();
    tasks = tasks.filter(t => {
      if (!t.due) return false; // safely skip tasks with no due date
      const dueDate = new Date(t.due.datetime || t.due.date);
      return (
        dueDate < now ||
        dueDate.toDateString() === now.toDateString()
      );
    });
  }

  // When showAll = true, we include all tasks (due + no-due)
  renderTasks(tasks);
  document.getElementById("loadingOverlay").style.display = "none"; // hide spinner
}
setInterval(fetchTasks, 60000);


// === RENDER TASKS ===
function renderTasks(tasks) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  PEOPLE.forEach(person => {
    const row = document.createElement("div");

    const nameCell = document.createElement("div");
    nameCell.textContent = person;
    row.appendChild(nameCell);

    let personTasks = tasks.filter(t => t.labels.includes(person));

    // ✅ Sort by upcoming due date (tasks without due dates go last)
    personTasks.sort((a, b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      const dateA = new Date(a.due.datetime || a.due.date);
      const dateB = new Date(b.due.datetime || b.due.date);
      return dateA - dateB;
    });

    if (personTasks.length === 0) {
      const placeholder = document.createElement("div");
      placeholder.className = "card";
      placeholder.textContent = "— No tasks —";
      row.appendChild(placeholder);
    } else {
      personTasks.forEach(t => {
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => openTaskMenu(t);

        let dueLabel = "No due date";
        let overdue = false;

        if (t.due) {
          const rawDate = t.due.datetime || t.due.date;
          const dueDate = new Date(rawDate);
          dueLabel = formatDueDate(dueDate);

          if (dueDate < new Date()) {
            overdue = true;
          }
        }

        if (overdue) card.classList.add("overdue");

        const emoji = pickEmoji(t.content);

        const icon = document.createElement("div");
        icon.textContent = emoji;
        icon.style.fontSize = "36px";

        const title = document.createElement("div");
        title.textContent = t.content;
        title.style.fontSize = "14px";
        title.style.textAlign = "center";

        const due = document.createElement("div");
        due.className = "due";
        due.textContent = dueLabel;

        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(due);
        row.appendChild(card);
      });
    }

    grid.appendChild(row);
  });
}


// === EMOJI PICKER ===
function pickEmoji(text) {
  const lower = text.toLowerCase();
  if (lower.includes("hair")) return "💈";
  if (lower.includes("garbage truck")) return "🗑️🚛"; 
  if (lower.includes("garbage") || lower.includes("trash")) return "🗑️";
  if (lower.includes("card")) return "🏞️"; 
  if (lower.includes("call")) return "☎️";
  if (lower.includes("dish")) return "🍽️";
  if (lower.includes("homework")) return "📚";
  if (lower.includes("exercise") || lower.includes("workout")) return "💪";
  if (lower.includes("dog") || lower.includes("walk")) return "🐕";
  if (lower.includes("tablet") || lower.includes("vitamin")) return "💊";
  if (lower.includes("car") || lower.includes("drive")) return "🚗";
  if (lower.includes("piano") || lower.includes("music")) return "🎼";
  if (lower.includes("violin" )) return "🎻";
  if (lower.includes("money") || lower.includes("cash")|| lower.includes("stock")) return "💲";
  if (lower.includes("rumi")) return "🐶";
  if (lower.includes("library") || lower.includes("book")) return "📚"; 
  if (lower.includes("holiday") || lower.includes("vacation")) return "🏖️"; 
  if (lower.includes("water")) return "💧"; 
  

  return "✅";
}

// === TASK MENU ===
function openTaskMenu(task) {
  selectedTask = task;
  document.getElementById("taskMenuTitle").textContent = task.content;
  document.getElementById("taskMenuOverlay").style.display = "flex";
}

function closeTaskMenu() {
  document.getElementById("taskMenuOverlay").style.display = "none";
  selectedTask = null;
}



async function snoozeTask(hours) {
  if (!selectedTask) return;

  // 🔑 Start from existing due date if available
  let baseDue = selectedTask.due?.datetime
    ? new Date(selectedTask.due.datetime)
    : selectedTask.due?.date
      ? new Date(selectedTask.due.date)
      : new Date(); // fallback if no due date set

  // Add snooze hours
  baseDue.setHours(baseDue.getHours() + hours);

  // Update Todoist
  await fetch(`https://api.todoist.com/rest/v2/tasks/${selectedTask.id}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      due_datetime: baseDue.toISOString()
    })
  });

  // Update local copy so further snoozes stack correctly
  selectedTask.due = { datetime: baseDue.toISOString() };

  // Add audit comment
  await addComment(
    selectedTask.id,
    `⏰ Snoozed by ${hours}h → now due ${baseDue.toLocaleString()}`
  );

  closeTaskMenu();
  fetchTasks();
}


// === ADD COMMENT ===
async function addComment(taskId, content) {
  await fetch(`https://api.todoist.com/rest/v2/comments`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      task_id: taskId,
      content: content
    })
  });
}


// === CREATE TASK MODAL ===
function openCreateTask() {
  document.getElementById("createTaskModal").style.display = "flex";
}
function closeCreateTask() {
  document.getElementById("createTaskModal").style.display = "none";
}

// === CREATE TASK ===
async function createTask() {
  if (!apiToken || !choresProjectId) return;

  const name = document.getElementById("newTaskName").value.trim();
  const assignee = document.getElementById("newTaskAssignee").value;
  const schedule = document.getElementById("newTaskSchedule").value.trim(); // NEW

  if (!name) {
    alert("Please enter a task name.");
    return;
  }

  // Ensure label exists for the assignee
  const ensuredLabel = await ensureLabelExists(assignee);

  // Build payload
  const payload = {
    content: name,
    project_id: choresProjectId,
    labels: [ensuredLabel],
  };

  // Add due_string if user provided one
  if (schedule) {
    payload.due_string = schedule;  // Todoist parses natural language here
  }

  // Send to Todoist
  await fetch("https://api.todoist.com/rest/v2/tasks", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // Reset form
  document.getElementById("newTaskName").value = "";
  document.getElementById("newTaskAssignee").value = "Sujay";
  document.getElementById("newTaskSchedule").value = ""; // clear schedule input
  closeCreateTask();

  fetchTasks();
}

// === DELETE TASK ===
async function deleteTask() {
  if (!selectedTask) return;

  if (!confirm("Are you sure you want to delete this task?")) {
    return;
  }

  await fetch(`https://api.todoist.com/rest/v2/tasks/${selectedTask.id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${apiToken}` }
  });

  // Optional: add audit comment before deletion
  await fetch("https://api.todoist.com/rest/v2/comments", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      task_id: selectedTask.id,
      content: `Task deleted at ${new Date().toLocaleString()}`
    })
  });

  closeTaskMenu();
  fetchTasks(); // refresh the board
}

// === COMPLETE / SNOOZE WITH AUDIT COMMENT ===
async function completeTask() {
  if (!selectedTask) return;

  // close task
  await fetch(`https://api.todoist.com/rest/v2/tasks/${selectedTask.id}/close`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}` }
  });

  // add comment for audit trail
  await addComment(selectedTask.id, `✅ Completed on ${new Date().toLocaleString()}`);

  closeTaskMenu();
  fetchTasks();
}

async function markTaskMissed() {
  if (!selectedTask) return;

    // ✅ Step 4: Close the task
    await fetch(`https://api.todoist.com/rest/v2/tasks/${selectedTask.id}/close`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiToken}` }
    });

        // Step 3: Add a comment
    const timestamp = new Date().toLocaleString();
    await addComment(selectedTask.id, `❌ Missed on ${timestamp}`);

    // Refresh UI
    closeTaskMenu();
    fetchTasks();

}





function formatDueDate(dueDate) {
  const now = new Date();
  const today = now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (dueDate.toDateString() === today) {
    // Only show time for today
    return dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (dueDate.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow " + dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    // Short style like "Tue, Aug 20, 9:00 AM"
    return dueDate.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

function showLoading() {
  document.getElementById("loadingOverlay").style.display = "flex";
}

function hideLoading() {
  document.getElementById("loadingOverlay").style.display = "none";
}

// Close modals when clicking outside of them
window.addEventListener("click", function(event) {
  const createTaskModal = document.getElementById("createTaskModal");
  const taskMenuModal = document.getElementById("taskMenuOverlay");

  // if clicked outside create task modal
  
  if (event.target === createTaskModal) {
    closeCreateTask();
  }

  // if clicked outside task menu modal
  if (event.target === taskMenuModal) {
    closeTaskMenu();
  }
    
});




// === BOOT ===
init();
