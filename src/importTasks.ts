import { PlaneClient, IssueCreatePayload } from './planeClient';
import * as fs from 'fs';

interface Task {
  id: string;
  name: string;
  status: string;
  dueDate: string | null;
  startDate: string | null;
  parentId: string | null;
  assignees: string[];
  priority: string | null;
  timeEstimated: string | null;
  planeId?: string; // To store the created task ID in Plane
}

// Add interface for state response
interface IssueState {
  id: string;
  name: string;
  color: string;
  group: 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled';
}

// Add possible response types
type ApiResponse<T> = T[] | { results?: T[]; [key: string]: any };

// Map priorities
const priorityMap: Record<string, 'urgent' | 'high' | 'medium' | 'low' | 'none'> = {
  '1': 'urgent',
  '2': 'high',
  '3': 'medium',
  '4': 'low',
  'null': 'none'
};

// Map status to state
const statusMap: Record<string, string> = {
  'taches à completer': 'to_do',
  'taches en planning': 'backlog',
  'taches terminé(e)s': 'done',
  'taches fermé(e)s': 'cancelled'
};

// Map for assignee IDs
const assigneeMap: Record<string, string> = {
  'Constant Suchet': '979222fc-93e1-4f1b-9eea-a2bf991f63d2',
  'Timothe SANDT': 'd5a15f09-6955-4374-b6d5-7a1c98cb614a',
  'Tahra Amine': '33af4a89-f0ee-4f72-b7e5-3181c8b415f1'
};

// Parse task data from CSV string
const parseTaskData = (csvData: string): Task[] => {
  const lines = csvData.trim().split('\n');
  const tasks: Task[] = [];
  
  for (const line of lines) {
    const [id, name, status, dueDate, startDate, parentId, assigneesStr, priority, timeEstimated] = line.split(';');
    
    // Parse assignees from format like "[Constant Suchet]" or "[Timothe SANDT,Constant Suchet]"
    const assigneesMatch = assigneesStr?.match(/\[(.*)\]/);
    const assigneeNames = assigneesMatch ? assigneesMatch[1].split(',').map(n => n.trim()) : [];
    const assignees = assigneeNames.map(name => assigneeMap[name]).filter(Boolean);
    
    tasks.push({
      id,
      name,
      status,
      dueDate: dueDate && dueDate !== '' ? dueDate : null,
      startDate: startDate && startDate !== '' ? startDate : null,
      parentId: parentId === 'null' ? null : parentId,
      assignees,
      priority,
      timeEstimated: timeEstimated && timeEstimated !== '' ? timeEstimated : null,
    });
  }
  
  return tasks;
};

// Group tasks by parent-child relationship
const groupTasksByHierarchy = (tasks: Task[]) => {
  const parentTasks: Task[] = tasks.filter(task => task.parentId === null);
  const childTasks: Task[] = tasks.filter(task => task.parentId !== null);
  
  return { parentTasks, childTasks };
};

// Create tasks in Plane
const createTasksInPlane = async () => {
  const client = new PlaneClient();
  await client.initialize();
  
  // Get states for mapping
  const statesResponse = await client.getIssueStates() as ApiResponse<IssueState>;
  
  // Debug the response
  console.log('States response:', JSON.stringify(statesResponse, null, 2));
  
  // Handle response format properly
  const states: IssueState[] = Array.isArray(statesResponse) ? statesResponse : 
                (statesResponse.results ? statesResponse.results : []);
  
  if (states.length === 0) {
    console.warn('No states found, using direct state names instead of mapping');
  }
  
  // Read CSV data
  const csvData = fs.readFileSync('datas.csv', 'utf8');
  const tasks = parseTaskData(csvData);
  
  // Group by hierarchy
  const { parentTasks, childTasks } = groupTasksByHierarchy(tasks);
  
  // Create parent tasks first
  console.log(`Creating ${parentTasks.length} parent tasks...`);
  const taskIdMap: Record<string, string> = {};
  
  for (const task of parentTasks) {
    try {
      // Map the status to a state
      let state = '';
      
      if (states.length > 0) {
        const stateObj = states.find(s => s.group && s.group.toLowerCase() === statusMap[task.status]);
        state = stateObj ? stateObj.id : '';
      }
      
      // If no state mapping found, use the status directly
      if (!state) {
        state = statusMap[task.status] || 'backlog';
      }
      
      const payload: IssueCreatePayload = {
        name: task.name,
        description: '',
        priority: priorityMap[task.priority || 'null'],
        state,
        assignees: task.assignees,
      };
      
      console.log(`Creating task: ${task.name} with state: ${state}`);
      const createdTask = await client.createIssue(payload);
      taskIdMap[task.id] = createdTask.id;
      console.log(`Created parent task: ${task.name} with ID: ${createdTask.id}`);
    } catch (error) {
      console.error(`Failed to create task ${task.name}:`, error);
    }
  }
  
  // Create child tasks
  console.log(`Creating ${childTasks.length} child tasks...`);
  for (const task of childTasks) {
    try {
      // Skip if parent doesn't exist in Plane yet
      if (!taskIdMap[task.parentId!]) {
        console.warn(`Parent task ${task.parentId} not found for task ${task.name}`);
        continue;
      }
      
      // Map the status to a state
      let state = '';
      
      if (states.length > 0) {
        const stateObj = states.find(s => s.group && s.group.toLowerCase() === statusMap[task.status]);
        state = stateObj ? stateObj.id : '';
      }
      
      // If no state mapping found, use the status directly
      if (!state) {
        state = statusMap[task.status] || 'backlog';
      }
      
      const payload: IssueCreatePayload = {
        name: task.name,
        description: '',
        priority: priorityMap[task.priority || 'null'],
        state,
        assignees: task.assignees,
        // Set parent reference
        parent: taskIdMap[task.parentId!],
      };
      
      console.log(`Creating child task: ${task.name} with state: ${state} and parent: ${taskIdMap[task.parentId!]}`);
      const createdTask = await client.createIssue(payload);
      taskIdMap[task.id] = createdTask.id;
      console.log(`Created child task: ${task.name} with ID: ${createdTask.id}`);
    } catch (error) {
      console.error(`Failed to create task ${task.name}:`, error);
    }
  }
  
  console.log('Task creation complete!');
};

// Run the main function
createTasksInPlane().catch(console.error);