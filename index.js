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

// Cloudinary Configuration (Replace with your actual values)
const CLOUDINARY_CLOUD_NAME = "dqyxzsnyq";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

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
    loadBooks();
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

// Cloudinary Upload Function
async function uploadToCloudinary(file, folder) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    showToast("Cloudinary configuration missing. Please update the code with your credentials.", "error");
    return null;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    
    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error(data.error.message || 'Upload failed');
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    showToast(`Upload failed: ${error.message}`, 'error');
    return null;
  }
}

// Load Books
async function loadBooks() {
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
      
      // Format categories as comma-separated string
      const categories = Array.isArray(data.categories) 
        ? data.categories.join(", ") 
        : (data.categories || "-");

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${doc.id}</td>
        <td>${data.title || "-"}</td>
        <td>${data.author || "-"}</td>
        <td>${categories}</td>
        <td>${data.coverURL ? `<img src="${data.coverURL}" alt="Cover" style="max-height: 100px; border-radius: 4px;">` : "-"}</td>
        <td>${data.section || "-"}</td>
        <td>${data.reads || "0"}</td>
        <td>${data.purchaseText ? `<a href="${data.purchaseText}" target="_blank" class="view-btn">Download PDF</a>` : "-"}</td>
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
    console.error("Error loading books:", error);
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
function openNewBookModal() {
  document.getElementById("new-book-modal").style.display = "block";
}

// Add Book
async function addNewBook() {
  const id = document.getElementById("new-id").value.trim();
  const title = document.getElementById("new-title").value.trim();
  const author = document.getElementById("new-author").value.trim();
  const categoriesInput = document.getElementById("new-categories").value.trim();
  const coverURL = document.getElementById("new-cover-url")?.value || "";
  const purchaseText = document.getElementById("new-purchase-url")?.value || "";
  const section = document.getElementById("new-section").value;
  const reads = parseInt(document.getElementById("new-reads").value) || 0;

  if (!id || !title || !author || !categoriesInput) {
    showToast("Please fill all required fields", "error");
    return;
  }

  // Split categories into array
  const categories = categoriesInput.split(',').map(cat => cat.trim()).filter(cat => cat);

  try {
    await setDoc(doc(db, "Books", id), {
      title: title,
      author: author,
      categories: categories,
      coverURL: coverURL,
      purchaseText: purchaseText,
      section: section,
      reads: reads,
      documentID: id
    });
    closeModal("new-book-modal");
    loadBooks();
    showToast("Book added successfully!", "success");
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
      document.getElementById("edit-title").value = data.title || "";
      document.getElementById("edit-author").value = data.author || "";
      document.getElementById("edit-categories").value = Array.isArray(data.categories) 
        ? data.categories.join(", ") 
        : (data.categories || "");
      
      // Set cover URL and preview
      if (data.coverURL) {
        document.getElementById("edit-cover-url").value = data.coverURL;
        document.getElementById("edit-cover-preview").innerHTML = 
          `<img src="${data.coverURL}" alt="Cover" style="max-height: 150px; border-radius: 4px;">`;
      } else {
        document.getElementById("edit-cover-url").value = "";
        document.getElementById("edit-cover-preview").innerHTML = "";
      }
      
      // Set purchase URL and preview
      if (data.purchaseText) {
        document.getElementById("edit-purchase-url").value = data.purchaseText;
        document.getElementById("edit-purchase-preview").innerHTML = 
          `<a href="${data.purchaseText}" target="_blank" class="view-btn">Download PDF</a>`;
      } else {
        document.getElementById("edit-purchase-url").value = "";
        document.getElementById("edit-purchase-preview").innerHTML = "";
      }
      
      document.getElementById("edit-section").value = data.section || "members";
      document.getElementById("edit-reads").value = data.reads || 0;
      
      document.getElementById("edit-book-modal").style.display = "block";
    } else {
      showToast("Document not found!", "error");
    }
  } catch (error) {
    showToast("Error: " + error.message, "error");
  }
}

// Update Book
async function updateBook() {
  const id = document.getElementById("edit-id").value;
  const title = document.getElementById("edit-title").value.trim();
  const author = document.getElementById("edit-author").value.trim();
  const categoriesInput = document.getElementById("edit-categories").value.trim();
  const coverURL = document.getElementById("edit-cover-url")?.value || "";
  const purchaseText = document.getElementById("edit-purchase-url")?.value || "";
  const section = document.getElementById("edit-section").value;
  const reads = parseInt(document.getElementById("edit-reads").value) || 0;

  // Split categories into array
  const categories = categoriesInput.split(',').map(cat => cat.trim()).filter(cat => cat);

  try {
    await setDoc(doc(db, "Books", id), {
      title: title,
      author: author,
      categories: categories,
      coverURL: coverURL,
      purchaseText: purchaseText,
      section: section,
      reads: reads,
      documentID: id
    }, { merge: true });
    closeModal("edit-book-modal");
    loadBooks();
    showToast("Book updated!", "success");
  } catch (error) {
    showToast("Error: " + error.message, "error");
  }
}

// Delete Book
async function deleteBook(id) {
  if (!confirm("⚠️ Delete this book?")) return;
  try {
    await deleteDoc(doc(db, "books", id));
    loadBooks();
    showToast("Book deleted!", "success");
  } catch (error) {
    showToast("Error: " + error.message, "error");
  }
}

// Close Modal
function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

// Handle Cover Upload
async function handleCoverUpload(isEdit = false) {
  const fileInput = isEdit ? document.getElementById("edit-cover-upload") : document.getElementById("cover-upload");
  const preview = isEdit ? document.getElementById("edit-cover-preview") : document.getElementById("cover-preview");
  const urlInput = isEdit ? document.getElementById("edit-cover-url") : document.getElementById("new-cover-url");
  
  const file = fileInput.files[0];
  if (!file) return;
  
  const url = await uploadToCloudinary(file, "books/covers");
  if (url) {
    urlInput.value = url;
    preview.innerHTML = `<img src="${url}" alt="Cover" style="max-height: 150px; border-radius: 4px;">`;
  }
}

// Handle Purchase PDF Upload
async function handlePurchaseUpload(isEdit = false) {
  const fileInput = isEdit ? document.getElementById("edit-purchase-upload") : document.getElementById("purchase-upload");
  const preview = isEdit ? document.getElementById("edit-purchase-preview") : document.getElementById("purchase-preview");
  const urlInput = isEdit ? document.getElementById("edit-purchase-url") : document.getElementById("new-purchase-url");
  
  const file = fileInput.files[0];
  if (!file) return;
  
  const url = await uploadToCloudinary(file, "books/pdfs");
  if (url) {
    urlInput.value = url;
    preview.innerHTML = `<a href="${url}" target="_blank" class="view-btn">Download PDF</a>`;
  }
}

// Attach Dynamic Buttons
function attachActionButtons() {
  // Edit/Delete
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => openEditModal(e.target.dataset.id));
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteBook(e.target.dataset.id));
  });
}

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  // Initialize hidden URL inputs
  const hiddenInputs = document.createElement('div');
  hiddenInputs.style.display = 'none';
  hiddenInputs.innerHTML = `
    <input type="hidden" id="new-cover-url">
    <input type="hidden" id="new-purchase-url">
    <input type="hidden" id="edit-cover-url">
    <input type="hidden" id="edit-purchase-url">
  `;
  document.body.appendChild(hiddenInputs);
  
  // Login/Logout
  document.getElementById("login-btn")?.addEventListener("click", login);
  document.getElementById("logout-btn")?.addEventListener("click", logout);
  
  // Books Management
  document.getElementById("new-book-btn")?.addEventListener("click", openNewBookModal);
  document.getElementById("search")?.addEventListener("input", searchTable);
  document.getElementById("add-book-btn")?.addEventListener("click", addNewBook);
  document.getElementById("update-book-btn")?.addEventListener("click", updateBook);
  document.getElementById("refresh-btn")?.addEventListener("click", () => {
    loadBooks();
    showToast("Data refreshed", "info");
  });
  document.getElementById("create-with-id-btn")?.addEventListener("click", (e) => {
    const id = e.target.dataset.searchId;
    if (id) {
      document.getElementById("new-id").value = id;
      openNewBookModal();
    }
  });
  
  // Cover Upload
  document.getElementById("cover-upload-btn")?.addEventListener("click", () => {
    document.getElementById("cover-upload").click();
  });
  document.getElementById("cover-upload")?.addEventListener("change", () => handleCoverUpload(false));
  
  document.getElementById("edit-cover-upload-btn")?.addEventListener("click", () => {
    document.getElementById("edit-cover-upload").click();
  });
  document.getElementById("edit-cover-upload")?.addEventListener("change", () => handleCoverUpload(true));
  
  // Purchase PDF Upload
  document.getElementById("purchase-upload-btn")?.addEventListener("click", () => {
    document.getElementById("purchase-upload").click();
  });
  document.getElementById("purchase-upload")?.addEventListener("change", () => handlePurchaseUpload(false));
  
  document.getElementById("edit-purchase-upload-btn")?.addEventListener("click", () => {
    document.getElementById("edit-purchase-upload").click();
  });
  document.getElementById("edit-purchase-upload")?.addEventListener("change", () => handlePurchaseUpload(true));
  
  // Close modals
  document.getElementById("close-new-modal")?.addEventListener("click", () => closeModal("new-book-modal"));
  document.getElementById("close-edit-modal")?.addEventListener("click", () => closeModal("edit-book-modal"));
  
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      closeModal("new-book-modal");
      closeModal("edit-book-modal");
    }
  });
});

// Auth State
auth.onAuthStateChanged((user) => {
  if (user) {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadBooks();
  } else {
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("login-screen").style.display = "block";
  }
});

// Export Functions (for module)
export {
  login,
  logout,
  openNewBookModal,
  addNewBook,
  updateBook,
  deleteBook,
  searchTable,
  closeModal
};
