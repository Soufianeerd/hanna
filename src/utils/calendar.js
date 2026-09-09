/**
 * Utilitaire pour télécharger l'événement Salma's Henna Day au format .ics standard
 * Compatible calendrier Apple (iOS), Google Calendar, Outlook, Android
 */
export function downloadHannaCalendar() {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hanna//Henna Day//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:hanna-henna-day-20261021@hannasalma.netlify.app',
    'DTSTART:20261021T160000Z',
    'SUMMARY:Salma\'s Henna Day',
    'LOCATION:Salle des fêtes Maurice Gérardin de Dommartin-lès-Toul, Allée de l\'Île des Sables, 54200 Dommartin-lès-Toul',
    'URL:https://hannasalma.netlify.app/',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.download = 'Salma-Henna-Day-21-10-2026.ics';
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
