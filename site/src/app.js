const copyButton = document.querySelector("[data-copy]")
const installCommand = document.querySelector("[data-install-command]")

copyButton?.addEventListener("click", async () => {
  if (!installCommand) return

  await navigator.clipboard.writeText(installCommand.textContent.trim())
  copyButton.textContent = "Copied"
  window.setTimeout(() => {
    copyButton.textContent = "Copy"
  }, 1400)
})

const screenshots = [...document.querySelectorAll("[data-shot]")]
const selectors = [...document.querySelectorAll("[data-shot-target]")]

for (const selector of selectors) {
  selector.addEventListener("click", () => {
    const target = selector.dataset.shotTarget

    for (const item of selectors) {
      item.setAttribute("aria-selected", String(item === selector))
    }

    for (const screenshot of screenshots) {
      screenshot.hidden = screenshot.dataset.shot !== target
    }
  })
}
