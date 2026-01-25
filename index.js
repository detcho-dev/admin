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
  query,
  where
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

// Cloudinary Configuration - Update with your actual credentials
const CLOUDINARY_CLOUD_NAME = "dqyxzsnyq"; // Replace with your Cloudinary cloud name
const CLOUDINARY_UPLOAD_PRESET = "ml_default"; // Replace with your upload preset

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
    console.error("Login error:", error);
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
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    
    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error(data.error?.message || 'Upload failed');
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    showToast(`Upload failed: ${error.message}`, 'error');
    return null;
  }
}

// Load Books - Modified to handle different collection paths
async function loadBooks() {
  const tableBody = document.getElementById("table-body");
  const noResultsDiv = document.getElementById("no-results");
  
  tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center">Loading...</td></tr>';

  try {
    // Try different collection paths - ADJUST THIS PATH ACCORDING TO YOUR ACTUAL STRUCTURE
    let querySnapshot;
    
    // Option 1: Try root collection "books"
    try {
      querySnapshot = await getDocs(collection(db, "Books"));
      console.log("Found books in root collection");
    } catch (error) {
      console.log("Root collection 'books' not found or inaccessible");
    }
    
    // Option 2: If no data found, try under "content" collection (common structure)
    if (!querySnapshot || querySnapshot.empty) {
      try {
        querySnapshot = await getDocs(collection(db, "content", "Books", "items"));
        console.log("Found books in content/books/items path");
      } catch (error) {
        console.log("content/books/items path not found");
      }
    }
    
    // Option 3: Try users collection if authenticated
    const user = auth.currentUser;
    if (!querySnapshot || querySnapshot.empty) {
      if (user) {
        try {
          querySnapshot = await getDocs(collection(db, "users", user.uid, "Books"));
          console.log("Found books in user's collection");
        } catch (error) {
          console.log("User books collection not found");
        }
      }
    }
    
    // Option 4: Try "library" collection
    if (!querySnapshot || querySnapshot.empty) {
      try {
        querySnapshot = await getDocs(collection(db, "library"));
        console.log("Found books in 'library' collection");
      } catch (error) {
        console.log("'library' collection not found");
      }
    }
    
    // If still no data, show empty state
    if (!querySnapshot || querySnapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center">No books found in any collection</td></tr>';
      noResultsDiv.style.display = "block";
      return;
    }

    // Log the actual data structure for debugging
    console.log("Books data structure:", querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    
    tableBody.innerHTML = "";
    noResultsDiv.style.display = "none";

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("Processing book:", doc.id, data);
      
      // Handle different possible field names - More flexible data mapping
      const title = data.title || data.bookTitle || data.name || "-";
      const author = data.author || data.writer || data.authors?.join(', ') || "-";
      
      // Handle categories in different formats
      let categories = "-";
      if (data.categories) {
        if (Array.isArray(data.categories)) {
          categories = data.categories.join(", ");
        } else if (typeof data.categories === 'string') {
          categories = data.categories;
        } else if (typeof data.categories === 'object') {
          categories = Object.values(data.categories).join(", ");
        }
      }
      
      const coverURL = data.coverURL || data.coverImage || data.image || data.thumbnail || "";
      const purchaseText = data.purchaseText || data.pdfUrl || data.downloadUrl || data.fileUrl || "";
      const section = data.section || data.category || "members";
      const reads = data.reads || data.views || data.downloadCount || 0;
      
      // Format section display
      const sectionDisplay = section === "members" ? "Members" : 
                           section === "readers" ? "Readers" : section;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${doc.id}</td>
        <td>${title}</td>
        <td>${author}</td>
        <td>${categories}</td>
        <td>${coverURL ? `<img src="${coverURL}" alt="Cover" style="max-height: 100px; max-width: 100px; border-radius: 4px;">` : "-"}</td>
        <td>${sectionDisplay}</td>
        <td>${reads}</td>
        <td>${purchaseText ? `<a href="${purchaseText}" target="_blank" class="view-btn">Download PDF</a>` : "-"}</td>
        <td class="actions">
          <button class="edit-btn" data-id="${doc.id}" data-path="${doc.ref.path}">Edit</button>
          <button class="delete-btn" data-id="${doc.id}" data-path="${doc.ref.path}">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    attachActionButtons();
    showToast(`Loaded ${querySnapshot.size} books successfully!`, "success");
  } catch (error) {
    console.error("Error loading books:", error);
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#ff4444">Error: ${error.message}</td></tr>`;
    showToast("Failed to load books: " + error.message, "error");
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
  // Reset form fields
  document.getElementById("new-id").value = "";
  document.getElementById("new-title").value = "";
  document.getElementById("new-author").value = "";
  document.getElementById("new-categories").value = "";
  document.getElementById("new-cover-url").value = "";
  document.getElementById("new-purchase-url").value = "";
  document.getElementById("new-section").value = "members";
  document.getElementById("new-reads").value = "0";
  document.getElementById("cover-preview").innerHTML = "";
  document.getElementById("purchase-preview").innerHTML = "";
  
  document.getElementById("new-book-modal").style.display = "block";
}

// Add Book
async function addNewBook() {
  const id = document.getElementById("new-id").value.trim();
  const title = document.getElementById("new-title").value.trim();
  const author = document.getElementById("new-author").value.trim();
  const categoriesInput = document.getElementById("new-categories").value.trim();
  const coverURL = document.getElementById("new-cover-url").value.trim();
  const purchaseText = document.getElementById("new-purchase-url").value.trim();
  const section = document.getElementById("new-section").value;
  const reads = parseInt(document.getElementById("new-reads").value) || 0;

  if (!id || !title || !author) {
    showToast("Please fill all required fields (ID, Title, Author)", "error");
    return;
  }

  // Split categories into array
  const categories = categoriesInput 
    ? categoriesInput.split(',').map(cat => cat.trim()).filter(cat => cat)
    : [];

  try {
    // ADJUST THIS PATH TO MATCH YOUR ACTUAL COLLECTION STRUCTURE
    const bookRef = doc(db, "Books", id); // Change this path if needed
    
    await setDoc(bookRef, {
      title: title,
      author: author,
      categories: categories,
      coverURL: coverURL,
      purchaseText: purchaseText,
      section: section,
      reads: reads,
      documentID: id,
      createdAt: new Date().toISOString()
    });
    
    closeModal("new-book-modal");
    loadBooks();
    showToast("Book added successfully!", "success");
  } catch (error) {
    console.error("Error adding book:", error);
    showToast("Error: " + error.message, "error");
  }
}

// Open Edit Modal
async function openEditModal(id, path = null) {
  try {
    let docRef;
    
    // Use the path if provided, otherwise try default paths
    if (path) {
      docRef = doc(db, path);
    } else {
      // Try different paths
      docRef = doc(db, "books", id);
    }
    
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("Editing book data:", data);
      
      document.getElementById("edit-id").value = id;
      document.getElementById("edit-title").value = data.title || data.bookTitle || data.name || "";
      document.getElementById("edit-author").value = data.author || data.writer || "";
      
      // Handle categories
      let categoriesText = "";
      if (data.categories) {
        if (Array.isArray(data.categories)) {
          categoriesText = data.categories.join(", ");
        } else if (typeof data.categories === 'string') {
          categoriesText = data.categories;
        } else if (typeof data.categories === 'object') {
          categoriesText = Object.values(data.categories).join(", ");
        }
      }
      document.getElementById("edit-categories").value = categoriesText;
      
      // Set cover URL and preview
      const coverURL = data.coverURL || data.coverImage || data.image || data.thumbnail || "";
      document.getElementById("edit-cover-url").value = coverURL;
      if (coverURL) {
        document.getElementById("edit-cover-preview").innerHTML = 
          `<img src="${coverURL}" alt="Cover" style="max-height: 150px; max-width: 150px; border-radius: 4px;">`;
      } else {
        document.getElementById("edit-cover-preview").innerHTML = "";
      }
      
      // Set purchase URL and preview
      const purchaseText = data.purchaseText || data.pdfUrl || data.downloadUrl || data.fileUrl || "";
      document.getElementById("edit-purchase-url").value = purchaseText;
      if (purchaseText) {
        document.getElementById("edit-purchase-preview").innerHTML = 
          `<a href="${purchaseText}" target="_blank" class="view-btn">Download PDF</a>`;
      } else {
        document.getElementById("edit-purchase-preview").innerHTML = "";
      }
      
      // Handle section
      const section = data.section || data.category || "members";
      document.getElementById("edit-section").value = 
        section === "members" || section === "readers" ? section : "members";
      
      // Handle reads
      const reads = data.reads || data.views || data.downloadCount || 0;
      document.getElementById("edit-reads").value = reads;
      
      // Store the document path for saving
      document.getElementById("edit-book-modal").dataset.docPath = docRef.path;
      
      document.getElementById("edit-book-modal").style.display = "block";
    } else {
      showToast("Document not found!", "error");
    }
  } catch (error) {
    console.error("Error opening edit modal:", error);
    showToast("Error: " + error.message, "error");
  }
}

// Update Book
async function updateBook() {
  const id = document.getElementById("edit-id").value;
  const title = document.getElementById("edit-title").value.trim();
  const author = document.getElementById("edit-author").value.trim();
  const categoriesInput = document.getElementById("edit-categories").value.trim();
  const coverURL = document.getElementById("edit-cover-url").value.trim();
  const purchaseText = document.getElementById("edit-purchase-url").value.trim();
  const section = document.getElementById("edit-section").value;
  const reads = parseInt(document.getElementById("edit-reads").value) || 0;
  const docPath = document.getElementById("edit-book-modal").dataset.docPath;

  // Split categories into array
  const categories = categoriesInput 
    ? categoriesInput.split(',').map(cat => cat.trim()).filter(cat => cat)
    : [];

  try {
    let docRef;
    
    // Use the stored document path if available
    if (docPath) {
      docRef = doc(db, docPath);
    } else {
      docRef = doc(db, "books", id); // Default path
    }
    
    await setDoc(docRef, {
      title: title,
      author: author,
      categories: categories,
      coverURL: coverURL,
      purchaseText: purchaseText,
      section: section,
      reads: reads,
      documentID: id,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    closeModal("edit-book-modal");
    loadBooks();
    showToast("Book updated!", "success");
  } catch (error) {
    console.error("Error updating book:", error);
    showToast("Error: " + error.message, "error");
  }
}

// Delete Book
async function deleteBook(id, path = null) {
  if (!confirm("⚠️ Delete this book? This action cannot be undone!")) return;
  
  try {
    let docRef;
    
    if (path) {
      docRef = doc(db, path);
    } else {
      docRef = doc(db, "books", id); // Default path
    }
    
    await deleteDoc(docRef);
    loadBooks();
    showToast("Book deleted!", "success");
  } catch (error) {
    console.error("Error deleting book:", error);
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
  if (!file) {
    showToast("Please select an image file", "error");
    return;
  }
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToast("Please select a valid image file (JPG, PNG, GIF, etc.)", "error");
    return;
  }
  
  showToast("Uploading cover image...", "info");
  
  const url = await uploadToCloudinary(file, "books/covers");
  if (url) {
    urlInput.value = url;
    preview.innerHTML = `<img src="${url}" alt="Cover" style="max-height: 150px; max-width: 150px; border-radius: 4px;">`;
    showToast("Cover image uploaded successfully!", "success");
  }
}

// Handle Purchase PDF Upload
async function handlePurchaseUpload(isEdit = false) {
  const fileInput = isEdit ? document.getElementById("edit-purchase-upload") : document.getElementById("purchase-upload");
  const preview = isEdit ? document.getElementById("edit-purchase-preview") : document.getElementById("purchase-preview");
  const urlInput = isEdit ? document.getElementById("edit-purchase-url") : document.getElementById("new-purchase-url");
  
  const file = fileInput.files[0];
  if (!file) {
    showToast("Please select a PDF file", "error");
    return;
  }
  
  // Validate file type
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    showToast("Please select a valid PDF file", "error");
    return;
  }
  
  showToast("Uploading PDF file...", "info");
  
  const url = await uploadToCloudinary(file, "books/pdfs");
  if (url) {
    urlInput.value = url;
    preview.innerHTML = `<a href="${url}" target="_blank" class="view-btn">Download PDF</a>`;
    showToast("PDF uploaded successfully!", "success");
  }
}

// Attach Dynamic Buttons
function attachActionButtons() {
  // Edit/Delete
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const path = e.target.dataset.path || null;
      openEditModal(id, path);
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const path = e.target.dataset.path || null;
      deleteBook(id, path);
    });
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
  
  // Add test data button for debugging
  const debugContainer = document.createElement('div');
  debugContainer.style.position = 'fixed';
  debugContainer.style.bottom = '20px';
  debugContainer.style.left = '20px';
  debugContainer.style.zIndex = '10000';
  debugContainer.innerHTML = `
    <button id="test-data-btn" style="padding: 8px 16px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Add Test Data
    </button>
  `;
  document.body.appendChild(debugContainer);
  
  document.getElementById("test-data-btn")?.addEventListener("click", async () => {
    try {
      // Add test book
      const testId = "test-book-" + Date.now();
      await setDoc(doc(db, "books", testId), {
        title: "Test Book",
        author: "Test Author",
        categories: ["Test", "Demo"],
        coverURL: "https://via.placeholder.com/150/92c952?text=Book+Cover",
        purchaseText: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        section: "readers",
        reads: 42,
        documentID: testId,
        createdAt: new Date().toISOString()
      });
      
      showToast("Test data added successfully!", "success");
      loadBooks();
    } catch (error) {
      console.error("Error adding test data:", error);
      showToast("Error: " + error.message, "error");
    }
  });
});

// Auth State
auth.onAuthStateChanged((user) => {
  console.log("Auth state changed:", user ? "User logged in" : "No user logged in");
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

// Add this for debugging purposes
window.debugLoadBooks = loadBooks;
