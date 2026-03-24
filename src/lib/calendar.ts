// src/lib/calendar.ts

export interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function generateIcsContent(events: CalendarEvent[], calName: string = "AeroFarm Schedule"): string {
  let icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AeroFarm Simulator//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${calName}`,
  ];

  for (const event of events) {
    icsLines.push(
      "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}@aerofarm`,
      `DTSTAMP:${formatDate(new Date())}`,
      // For all-day events, typically we use DTSTART;VALUE=DATE:YYYYMMDD but standard ISO is safer for all cal apps
      `DTSTART:${formatDate(event.startDate)}`,
      `DTEND:${formatDate(event.endDate)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
      "END:VEVENT"
    );
  }

  icsLines.push("END:VCALENDAR");
  return icsLines.join("\n") + "\n";
}

export function downloadIcsFile(content: string, filename: string = "aerofarm-schedule.ics") {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
