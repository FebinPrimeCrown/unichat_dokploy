const convertToUserTimeZone = (dateString: string) => {
    // Manually extract date and time parts
    const [datePart, timePart] = dateString.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes, seconds] = timePart.split(":").map(Number);
  
    // Create a Date object assuming the input is in UTC
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  
    // Format date as "Aug 03, 2025, 04:54:04 AM"
    return utcDate.toLocaleString(undefined, {
      year: "numeric",
      month: "short", // "Aug"
      day: "2-digit", // "03"
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true, // Ensure AM/PM format
    }).replace(/^(\d{2}) (\w{3})/, "$2 $1"); // Reorder day & month
  };

export default convertToUserTimeZone