// Firebase Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBlOVx-YSmPFeq3lp-gAGe576yG1RhMLYs",
  authDomain: "mymlibraryreads.firebaseapp.com",
  projectId: "mymlibraryreads",
  storageBucket: "mymlibraryreads.firebasestorage.app",
  messagingSenderId: "11947740896",
  appId: "1:11947740896:web:87482eb72210acdba50a85"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Toast Notification
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.transform = "translateX(0)";
  
  if (type === "success") toast.style.background = "#2e7d32";
  else if (type === "error") toast.style.background = "#d32f2f";
  else toast.style.background = "#333";
  
  setTimeout(() => {
    toast.style.transform = "translateX(200%)";
  }, 3000);
}

// Login
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("login-error");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadProjects();
    errorEl.style.display = "none";
  } catch (error) {
    errorEl.textContent = "Error: " + error.message;
    errorEl.style.display = "block";
  }
}

// Logout
async function logout() {
  try {
    await signOut(auth);
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("login-screen").style.display = "block";
  } catch (error) {
    console.error("Logout error:", error);
  }
}

function getSupportStatusText(endDateString) {
  // التعامل مع "un" كدعم غير محدود
  if (!endDateString || endDateString.trim().toLowerCase() === "x") {
    return "Unavilable";
  }

  
// Load Projects
async function loadProjects() {
  const tableBody = document.getElementById("table-body");
  tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center">Loading...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "Books"));
    tableBody.innerHTML = "";

    if (querySnapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center">No books found</td></tr>';
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();

     
     

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${doc.id}</td>
        <td>${data.Title || "-"}</td>
        <td><img src="${data.CoverURL || "-"}" height="40px" width="20px"></td>
        <td>${data.Reads || "-"}</td>
        <td>${getSupportStatusText(data.PurchaseText)}</td>
        <td class="actions">
          <button class="edit-btn" data-id="${doc.id}">Edit</button>
          <button class="delete-btn" data-id="${doc.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    //Ended Here (Add Categories in table)

    attachActionButtons();
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#ff4444">Error: ${error.message}</td></tr>`;
    console.error("Error loading projects:", error);
  }
}

// Search
function searchTable() {
  const searchTerm = document.getElementById("search").value.trim().toLowerCase();
  const tableBody = document.getElementById("table-body");
  const noResultsDiv = document.getElementById("no-results");
  const createBtn = document.getElementById("create-with-id-btn");
  
  noResultsDiv.style.display = "none";
  
  if (searchTerm === "") {
    document.querySelectorAll("#table-body tr").forEach(row => row.style.display = "");
    return;
  }

  let hasMatch = false;
  document.querySelectorAll("#table-body tr").forEach(row => {
    const cells = row.querySelectorAll("td:not(.actions):not(:nth-child(9))");
    let match = false;
    cells.forEach(cell => {
      if (cell.textContent.toLowerCase().includes(searchTerm)) match = true;
    });
    if (match) {
      row.style.display = "";
      hasMatch = true;
    } else {
      row.style.display = "none";
    }
  });

  if (!hasMatch) {
    noResultsDiv.style.display = "block";
    if (searchTerm && !searchTerm.includes(" ")) {
      createBtn.textContent = `Create with ID: "${searchTerm}"`;
      createBtn.style.display = "inline-block";
      createBtn.dataset.searchId = searchTerm;
    } else {
      createBtn.style.display = "none";
    }
  }
}

// Open New Modal
function openNewProjectModal() {
  document.getElementById("new-project-modal").style.display = "block";
}

// Add Project
async function addNewProject() {
  const id = document.getElementById("new-id").value.trim();
  const customer = document.getElementById("new-customer").value.trim();
  const projectName = document.getElementById("new-project-name").value.trim();
  const status = document.getElementById("new-status").value.trim();
  const supportStatus = document.getElementById("new-support-status").value.trim();
  const deployment = document.getElementById("new-deployment").value.trim();
  const supportEnd = document.getElementById("new-support-end").value.trim();
  const url = document.getElementById("new-url").value.trim();

  if (!id || !customer || !projectName || !url) {
    showToast("Please fill all required fields", "error");
    return;
  }

  try { new URL(url); } catch {
    showToast("Please enter a valid URL", "error");
    return;
  }

  try {
    await setDoc(doc(db, "Books", id), {
      customerName: customer,
      projectName: projectName,
      projectStatus: status,
      supportStatus: supportStatus,
      deploymentDate: deployment,
      supportEndDate: supportEnd,
      url: url,
    });
    closeModal("new-project-modal");
    loadProjects();
    showToast("Project added successfully!", "success");
  } catch (error) {
    showToast("Error: " + error.message, "error");
  }
}

// Open Edit Modal
async function openEditModal(id) {
  try {
    const docRef = doc(db, "Books", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById("edit-id").value = id;
      document.getElementById("edit-customer").value = data.customerName || "";
      document.getElementById("edit-project-name").value = data.projectName || "";
      document.getElementById("edit-status").value = data.projectStatus || "Live";
      document.getElementById("edit-support-status").value = data.supportStatus || "Active";
      document.getElementById("edit-deployment").value = data.deploymentDate || "";
      document.getElementById("edit-support-end").value = data.supportEndDate || "";
      document.getElementById("edit-url").value = data.url || "";
      document.getElementById("edit-project-modal").style.display = "block";
    } else {
      showToast("Document not found!", "error");
    }
  } catch (error) {
    showToast("Error: " + error.message, "error");
  }
}

// Update Project
async function updateProject() {
  const id = document.getElementById("edit-id").value;
  const customer = document.getElementById("edit-customer").value.trim();
  const projectName = document.getElementById("edit-project-name").value.trim();
  const status = document.getElementById("edit-status").value.trim();
  const supportStatus = document.getElementById("edit-support-status").value.trim();
  const deployment = document.getElementById("edit-deployment").value.trim();
  const supportEnd = document.getElementById("edit-support-end").value.trim();
  const url = document.getElementById("edit-url").value.trim();

  try {
    await setDoc(doc(db, "Books", id), {
      customerName: customer,
      projectName: projectName,
      projectStatus: status,
      supportStatus: supportStatus,
      deploymentDate: deployment,
      supportEndDate: supportEnd,
      url: url,
    }, { merge: true });
    closeModal("edit-project-modal");
    loadProjects();
    showToast("Project updated!", "success");
  } catch (error) {
    showToast("Error: " + error.message, "error");
  }
}

// Delete Project
async function deleteProject(id) {
  if (!confirm("⚠️ Delete this project?")) return;
  try {
    await deleteDoc(doc(db, "Books", id));
    loadProjects();
    showToast("Project deleted!", "success");
  } catch (error) {
    showToast("Error: " + error.message, "error");
  }
}

// Close Modal
function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

// Attach Dynamic Buttons
function attachActionButtons() {
  // Copy Link
  document.querySelectorAll('.copy-link-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const url = e.target.dataset.url || 'https://example.com';
      const encoded = encodeURIComponent(url);
      const link = `https://detcho-dev.github.io/Yossef-DEV/port?url=${encoded}&id=${id}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
          showToast("Link copied!", "success");
        }).catch(() => {
          prompt("Copy this link:", link);
        });
      } else {
        prompt("Copy this link:", link);
      }
    });
  });

  // Edit/Delete
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => openEditModal(e.target.dataset.id));
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteProject(e.target.dataset.id));
  });
}

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("login-btn")?.addEventListener("click", login);
  document.getElementById("logout-btn")?.addEventListener("click", logout);
  document.getElementById("new-project-btn")?.addEventListener("click", openNewProjectModal);
  document.getElementById("search")?.addEventListener("input", searchTable);
  document.getElementById("add-project-btn")?.addEventListener("click", addNewProject);
  document.getElementById("update-project-btn")?.addEventListener("click", updateProject);
  document.getElementById("refresh-btn")?.addEventListener("click", () => {
    loadProjects();
    showToast("Data refreshed", "info");
  });
  document.getElementById("create-with-id-btn")?.addEventListener("click", (e) => {
    const id = e.target.dataset.searchId;
    if (id) {
      document.getElementById("new-id").value = id;
      openNewProjectModal();
    }
  });
  
  // Close modals
  document.getElementById("close-new-modal")?.addEventListener("click", () => closeModal("new-project-modal"));
  document.getElementById("close-edit-modal")?.addEventListener("click", () => closeModal("edit-project-modal"));
  
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      closeModal("new-project-modal");
      closeModal("edit-project-modal");
    }
  });
});

// Auth State
auth.onAuthStateChanged((user) => {
  if (user) {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadProjects();
  } else {
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("login-screen").style.display = "block";
  }
});

// Export Functions (for module)
export {
  login,
  logout,
  openNewProjectModal,
  addNewProject,
  updateProject,
  deleteProject,
  searchTable,
  closeModal
};
