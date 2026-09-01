function welcome() {
  const name = document.getElementById("name").value.trim();
  const message = document.getElementById("message");

  if (!name) {
    message.innerText = "Please enter your name.";
    return;
  }

  message.innerText = `Welcome back, ${name}!`;
}
