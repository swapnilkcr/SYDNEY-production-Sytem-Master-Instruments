// Helper to get the active job's task for a staff member
// Returns the task name or null if not found
async function getActiveJobTask(staffName) {
    try {
        const res = await fetch(`${BASE_URL}/view-running-jobs`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.runningJobs) return null;
        const active = data.runningJobs.find(j => j.staffName === staffName && !j.stopTime);
        return active ? active.task : null;
    } catch (e) {
        return null;
    }
}
