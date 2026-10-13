/**
 * Spot FX is typically closed Fri 22:00 UTC → Sun 22:00 UTC
 * (NY close → Sydney open). OTC binary is available on weekends.
 */
export function isForexMarketOpen(now = new Date()): boolean {
  const day = now.getUTCDay() // 0 Sun … 6 Sat
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const closeFri = 22 * 60
  const openSun = 22 * 60

  if (day === 6) return false // Saturday
  if (day === 5 && minutes >= closeFri) return false // Friday after close
  if (day === 0 && minutes < openSun) return false // Sunday before open
  return true
}

export function isForexWeekendClosed(now = new Date()): boolean {
  return !isForexMarketOpen(now)
}
