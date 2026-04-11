class NotificationService {
  constructor() {
    this.clients = [];
  }

  addClient(res) {
    this.clients.push(res);
    console.log(`Client connected. Total clients: ${this.clients.length}`);
  }

  removeClient(res) {
    this.clients = this.clients.filter(client => client !== res);
    console.log(`Client disconnected. Total clients: ${this.clients.length}`);
  }

  sendNotification(data) {
    this.clients.forEach(client => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }

  sendNewLeadNotification(lead) {
    this.sendNotification({
      type: 'new_lead',
      title: 'New Lead Received',
      message: `${lead.name} - ${lead.projectType}`,
      data: lead,
      timestamp: new Date().toISOString()
    });
  }

  sendTaskReminder(task) {
    this.sendNotification({
      type: 'task_reminder',
      title: 'Task Due Soon',
      message: task.title,
      data: task,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new NotificationService();