
const startButton = document.getElementById("startButton");
const buttonText = document.getElementById("buttonText");
const message = document.getElementById("message");

startButton.addEventListener("click", () => {
  buttonText.textContent = "COMING SOON";
  message.textContent =
    "Your journey begins here. The road is being built.";
  startButton.disabled = true;
  startButton.style.opacity = "0.7";
  startButton.style.cursor = "default";
});

