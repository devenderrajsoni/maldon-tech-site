const socket = io();

// LOGIN
function login() {
  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.value,
      password: password.value
    })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) window.location = "/dashboard";
      else error.innerText = "Invalid login credentials";
    });
}

// SHOW / HIDE SECTIONS
function showSection(id) {
  document.querySelectorAll(".section").forEach(sec => (sec.style.display = "none"));
  document.getElementById(id).style.display = "block";
}

// THEME TOGGLE
function toggleTheme() {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
}

// LOAD DATA ON DASHBOARD
window.onload = () => {
  loadClients();
  loadVendors();
  loadPotential();
  loadAttendance();
  loadPayments();
  loadChat();
};

// ADD CLIENT
function addClient() {
  fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: cname.value,
      location: cloc.value,
      commodity: ccom.value,
      purchase_date: cpur.value,
      delivery_date: cdel.value
    })
  });
  alert("Client added");
  loadClients();
}

function loadClients() {
  fetch("/api/clients")
    .then(r => r.json())
    .then(data => {
      countClients.innerText = "Total Clients: " + data.length;
      clientList.innerText = JSON.stringify(data, null, 2);
    });
}

// ADD VENDOR
function addVendor() {
  fetch("/api/vendors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: vname.value,
      location: vloc.value,
      commodity: vcom.value,
      purchase_date: vpur.value,
      delivery_date: vdel.value
    })
  });
  alert("Vendor added");
  loadVendors();
}

function loadVendors() {
  fetch("/api/vendors")
    .then(r => r.json())
    .then(data => {
      countVendors.innerText = "Total Vendors: " + data.length;
      vendorList.innerText = JSON.stringify(data, null, 2);
    });
}

// ADD POTENTIAL CLIENT
function addPotential() {
  fetch("/api/potential-clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: pname.value,
      pitch_details: ppitch.value
    })
  });
  alert("Potential client added");
  loadPotential();
}

function loadPotential() {
  fetch("/api/potential-clients")
    .then(r => r.json())
    .then(data => {
      countPotential.innerText = "Potential Clients: " + data.length;
      potentialList.innerText = JSON.stringify(data, null, 2);
    });
}

// TICKET
function addTicket() {
  fetch("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issue: issue.value })
  });
  alert("Ticket submitted");
}

// ATTENDANCE
function clock(type) {
  fetch("/api/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type })
  });
  alert("Attendance " + type);
  loadAttendance();
}

function loadAttendance() {
  fetch("/api/attendance")
    .then(r => r.json())
    .then(data => {
      attendanceList.innerText = JSON.stringify(data, null, 2);
    });
}

// PAYMENTS
function addPayment() {
  fetch("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client: payClient.value,
      amount: payAmount.value,
      status: payStatus.value
    })
  });
  alert("Payment added");
  loadPayments();
}

function loadPayments() {
  fetch("/api/payments")
    .then(r => r.json())
    .then(data => {
      paymentList.innerText = JSON.stringify(data, null, 2);
    });
}

// CHAT
function sendChat() {
  const msg = chatInput.value;
  socket.emit("chatMessage", { sender: "You", text: msg });
  chatInput.value = "";
}

socket.on("chatMessage", (msg) => {
  const div = document.createElement("div");
  div.innerText = `[${msg.time}] ${msg.sender}: ${msg.message}`;
  chatBox.appendChild(div);
});

function loadChat() {
  fetch("/api/chat")
    .then(r => r.json())
    .then(data => {
      data.forEach(msg => {
        const div = document.createElement("div");
        div.innerText = `[${msg.time}] ${msg.sender}: ${msg.message}`;
        chatBox.appendChild(div);
      });
    });
}

// TOOLS
function convert() {
  inr.innerText = "INR: " + (usd.value * 83.2);
}

function calculate() {
  calc_result.innerText = "Result: " + (Number(num1.value) + Number(num2.value));
}

// FILE UPLOAD
function uploadFile() {
  const file = fileUpload.files[0];
  const formData = new FormData();
  formData.append("file", file);

  fetch("/api/upload", {
    method: "POST",
    body: formData
  })
    .then(r => r.json())
    .then(data => {
      uploadStatus.innerText = data.success ? "Uploaded!" : "Upload failed.";
    });
}

// EXPORT
function exportClientsExcel() {
  window.location = "/export/clients/excel";
}

function exportClientsPDF() {
  window.location = "/export/clients/pdf";
}
