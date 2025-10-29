import { app } from 'electron'

export function relaunch(): void {
  app.relaunch()
  app.quit()
}
