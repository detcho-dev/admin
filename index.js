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

// Google Drive Link Transformer
function formatDriveLink(url) {
  if (!url) return "";
  let cleanUrl = url.trim();
  
  if (cleanUrl.toLowerCase() === 'x') {
    return 'x';
  }

  // 1. Remove /view?usp=drive_link and anything after it
  if (cleanUrl.includes('/view')) {
    cleanUrl = cleanUrl.split('/view')[0];
  }
  
  // 2. Replace /file/d/ with /uc?export=download&id=
  if (cleanUrl.includes('/file/d/')) {
    cleanUrl = cleanUrl.replace('/file/d/', '/uc?export=download&id=');
  }
  
  return cleanUrl;
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

// Load Projects
async function loadProjects() {
  const tableBody = document.getElementById("table-body");
  tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center">Loading...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "Books"));
    tableBody.innerHTML = "";

    if (querySnapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center">No books found</td></tr>';
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Handle array formatting for Categories
      const categoriesDisplay = Array.isArray(data.Categories) 
        ? data.Categories.join(", ") 
        : (data.Categories || "-");

      // Handle 'x' for Unavailable vs valid download link
      let linkDisplay = "-";
      const pText = data.PurchaseText ? data.PurchaseText.trim().toLowerCase() : "";
      
      if (pText === "x") {
        linkDisplay = `<span style="color: #cf6679; font-weight: bold;">Unavailable</span>`;
      } else if (data.PurchaseText) {
        linkDisplay = `<a href="${data.PurchaseText}" target="_blank" class="view-btn">Download</a>`;
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${data.DocumentID || doc.id}</td>
        <td>${data.Title || "-"}</td>
        <td>
          <img 
            src="${data.CoverURL || 'https://via.placeholder.com/30x40/2d2d2d/e0e0e0?text=?'}" 
            onerror="this.onerror=null; this.src='https://via.placeholder.com/30x40/cf6679/ffffff?text=X';" 
            height="40" width="30" 
            style="object-fit: cover; border-radius: 4px;"
            alt="Cover"
          >
        </td>
        <td>${data.Author || "-"}</td>
        <td>${categoriesDisplay}</td>
        <td>${data.Section || "-"}</td>
        <td>${data.Reads || "0"}</td>
        <td>${linkDisplay}</td>
        <td class="actions">
          <button class="edit-btn" data-id="${doc.id}">Edit</button>
          <button class="delete-btn" data-id="${doc.id}">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    attachActionButtons();
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#ff4444">Error: ${error.message}</td></tr>`;
  }
}

// Search
function searchTable() {
  const searchTerm = document.getElementById("search").value.trim().toLowerCase();
  const noResultsDiv = document.getElementById("no-results");
  const createBtn = document.getElementById("create-with-id-btn");
  
  noResultsDiv.style.display = "none";
  
  if (searchTerm === "") {
    document.querySelectorAll("#table-body tr").forEach(row => row.style.display = "");
    return;
  }

  let hasMatch = false;
  document.querySelectorAll("#table-body tr").forEach(row => {
    const cells = row.querySelectorAll("td:not(.actions)");
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
  const title = document.getElementById("new-title").value.trim();
  const author = document.getElementById("new-author").value.trim();
  const cover = document.getElementById("new-cover").value.trim();
  const section = document.getElementById("new-section").value.trim();
  const reads = document.getElementById("new-reads").value.trim();
  const categoriesInput = document.getElementById("new-categories").value.trim();
  const rawPurchaseText = document.getElementById("new-purchase-text").value.trim();

  if (!id || !title) {
    showToast("ID and Title are required", "error");
    return;
  }

  // Convert comma-separated string to array
  const categoriesArray = categoriesInput.split(',').map(item => item.trim()).filter(item => item !== "");
  
  // Format Drive Link before saving
  const formattedPurchaseText = formatDriveLink(rawPurchaseText);

  try {
    await setDoc(doc(db, "Books", id), {
      DocumentID: id,
      Title: title,
      Author: author,
      CoverURL: cover,
      Section: section,
      Reads: Number(reads) || 0, 
      Categories: categoriesArray,
      PurchaseText: formattedPurchaseText,
    });
    closeModal("new-project-modal");
    
    // Clear inputs after save
    document.querySelectorAll('#new-project-modal input').forEach(input => input.value = '');
    
    loadProjects();
    showToast("Book added!", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}

// Open Edit Modal
async function openEditModal(id) {
  try {
    const docRef = doc(db, "Books", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      const categoriesString = Array.isArray(data.Categories) ? data.Categories.join(", ") : data.Categories;

      document.getElementById("edit-id").value = id;
      document.getElementById("edit-title").value = data.Title || "";
      document.getElementById("edit-author").value = data.Author || "";
      document.getElementById("edit-cover").value = data.CoverURL || "";
      document.getElementById("edit-section").value = data.Section || "members";
      document.getElementById("edit-reads").value = data.Reads || "0";
      document.getElementById("edit-categories").value = categoriesString || "";
      
      // We show the already formatted link, or 'x'
      document.getElementById("edit-purchase-text").value = data.PurchaseText || "";
      
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
  const title = document.getElementById("edit-title").value.trim();
  const author = document.getElementById("edit-author").value.trim();
  const cover = document.getElementById("edit-cover").value.trim();
  const section = document.getElementById("edit-section").value.trim();
  const reads = document.getElementById("edit-reads").value.trim();
  const categoriesInput = document.getElementById("edit-categories").value.trim();
  const rawPurchaseText = document.getElementById("edit-purchase-text").value.trim();

  const categoriesArray = categoriesInput.split(',').map(item => item.trim()).filter(item => item !== "");
  
  // Format Drive Link before updating
  const formattedPurchaseText = formatDriveLink(rawPurchaseText);

  try {
    await setDoc(doc(db, "Books", id), {
      DocumentID: id,
      Title: title,
      Author: author,
      CoverURL: cover,
      Section: section,
      Reads: Number(reads) || 0,
      Categories: categoriesArray,
      PurchaseText: formattedPurchaseText,
    }, { merge: true });
    
    closeModal("edit-project-modal");
    loadProjects();
    showToast("Book updated!", "success");
  } catch (error) {
    showToast("Error: " + error.message, "error");
  }
}

// Delete Project
async function deleteProject(id) {
  if (!confirm("⚠️ Delete this book?")) return;
  try {
    await deleteDoc(doc(db, "Books", id));
    loadProjects();
    showToast("Book deleted!", "success");
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
