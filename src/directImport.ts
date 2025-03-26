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

// Import all tasks directly
const directImport = async () => {
  const client = new PlaneClient();
  await client.initialize();
  
  // Get states for mapping
  console.log('Fetching issue states...');
  const statesResponse = await client.getIssueStates() as ApiResponse<IssueState>;
  
  // Handle response format properly
  const states: IssueState[] = Array.isArray(statesResponse) ? statesResponse : 
                (statesResponse.results ? statesResponse.results : []);
  
  if (states.length === 0) {
    console.error('No states found - cannot proceed without valid state IDs');
    return;
  }
  
  // Create a mapping of state groups to IDs
  console.log('\n====== STATE MAPPING ======');
  const stateMapping: Record<string, string> = {};
  for (const state of states) {
    const groupKey = state.group.toLowerCase();
    stateMapping[groupKey] = state.id;
    console.log(`${groupKey} -> ${state.id} (${state.name})`);
  }
  console.log('===========================\n');
  
  // Read CSV data
  try {
    const csvData = fs.readFileSync('datas.csv', 'utf8');
    const tasks = parseTaskData(csvData);
    
    console.log(`Importing ${tasks.length} tasks directly...`);
    const createdTasks: string[] = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      try {
        // Map the status to a state ID
        const statusKey = statusMap[task.status] || 'backlog';
        const stateId = stateMapping[statusKey];
        
        if (!stateId) {
          console.error(`Cannot find state ID for status "${task.status}" (mapped to "${statusKey}")`);
          continue;
        }
        
        const payload: IssueCreatePayload = {
          name: task.name,
          description: task.timeEstimated ? `Estimated time: ${task.timeEstimated}` : '',
          priority: priorityMap[task.priority || 'null'],
          state: stateId,
          assignees: task.assignees,
        };
        
        console.log(`Creating task ${i+1}/${tasks.length}: ${task.name}`);
        const createdTask = await client.createIssue(payload);
        createdTasks.push(`${task.name} (${createdTask.id})`);
        console.log(`Created task: ${task.name} with ID: ${createdTask.id}`);
      } catch (error) {
        console.error(`Failed to create task ${task.name}:`, error);
      }
    }
    
    // Summary of created tasks
    console.log('\n====== CREATED TASKS SUMMARY ======');
    console.log(`Successfully created ${createdTasks.length}/${tasks.length} tasks`);
    console.log('==================================\n');
    
  } catch (error) {
    console.error('Error reading or processing CSV file:', error);
  }
  
  console.log('Direct import complete!');
};

// Run the direct import function
directImport().catch(console.error); 