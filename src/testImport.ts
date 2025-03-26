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
  planeId?: string;
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

// Sample tasks for testing
const sampleTasks: Task[] = [
  // Parent task 1
  {
    id: '86c2qfwg9',
    name: 'Créer les premiers dossiers légaux (PARENT)',
    status: 'taches en planning',
    dueDate: '3/29/2025, 4:00:00 AM GMT+1',
    startDate: null,
    parentId: null, // This is a parent task
    assignees: [assigneeMap['Constant Suchet']],
    priority: '3',
    timeEstimated: '4 h'
  },
  // Child of Parent 1
  {
    id: '86c2qfwyp',
    name: 'Préparer les mentions légales (CHILD)',
    status: 'taches à completer',
    dueDate: null,
    startDate: null,
    parentId: '86c2qfwg9', // This is a child of the first task
    assignees: [assigneeMap['Constant Suchet']],
    priority: '3',
    timeEstimated: '30 m'
  },
  // Child of Parent 1
  {
    id: '86c2qfwyu',
    name: 'Rédiger les CGU (CHILD)',
    status: 'taches à completer',
    dueDate: null,
    startDate: null,
    parentId: '86c2qfwg9', // This is another child of the first task
    assignees: [assigneeMap['Constant Suchet']],
    priority: '2',
    timeEstimated: '1 h'
  },
  // Parent task 2
  {
    id: '86c2qqxkd',
    name: 'Création du Dashboard (PARENT)',
    status: 'taches en planning',
    dueDate: '4/21/2025, 4:00:00 AM GMT+2',
    startDate: null,
    parentId: null, // This is a parent task
    assignees: [assigneeMap['Constant Suchet']],
    priority: '1',
    timeEstimated: null
  },
  // Child of Parent 2
  {
    id: '86c2qr3y3',
    name: 'Optimiser les requêtes API (CHILD)',
    status: 'taches à completer',
    dueDate: null,
    startDate: null,
    parentId: '86c2qqxkd', // This is a child of the second task
    assignees: [],
    priority: null,
    timeEstimated: '30 m'
  },
  // Parent task 3
  {
    id: '86c2qk38c',
    name: 'Améliorer la sécurité du site (PARENT)',
    status: 'taches en planning',
    dueDate: '3/31/2025, 4:00:00 AM GMT+2',
    startDate: null,
    parentId: null, // This is a parent task
    assignees: [assigneeMap['Constant Suchet']],
    priority: '2',
    timeEstimated: null
  },
  // Child of Parent 3
  {
    id: '86c2qk3df',
    name: 'Vérification par mail (CHILD)',
    status: 'taches à completer',
    dueDate: null,
    startDate: null,
    parentId: '86c2qk38c', // This is a child of the third task
    assignees: [],
    priority: null,
    timeEstimated: '2 h'
  }
];

// Group tasks by parent-child relationship
const groupTasksByHierarchy = (tasks: Task[]) => {
  const parentTasks: Task[] = tasks.filter(task => task.parentId === null);
  const childTasks: Task[] = tasks.filter(task => task.parentId !== null);
  
  return { parentTasks, childTasks };
};

// Create test tasks in Plane
const testImport = async () => {
  const client = new PlaneClient();
  await client.initialize();
  
  // Group by hierarchy and log the structure clearly
  const { parentTasks, childTasks } = groupTasksByHierarchy(sampleTasks);
  
  console.log('\n====== TASK HIERARCHY ======');
  console.log(`Total tasks: ${sampleTasks.length}`);
  console.log(`Parent tasks: ${parentTasks.length}`);
  console.log(`Child tasks: ${childTasks.length}`);
  
  // Display parent-child relationships
  for (const parent of parentTasks) {
    console.log(`\nPARENT: ${parent.name} (${parent.id})`);
    const children = sampleTasks.filter(task => task.parentId === parent.id);
    if (children.length > 0) {
      console.log(`  Children (${children.length}):`);
      for (const child of children) {
        console.log(`  - ${child.name} (${child.id})`);
      }
    } else {
      console.log('  No children');
    }
  }
  console.log('\n============================\n');
  
  // Get states for mapping
  console.log('Fetching issue states...');
  const statesResponse = await client.getIssueStates() as ApiResponse<IssueState>;
  
  // Debug the response
  console.log('States response:', JSON.stringify(statesResponse, null, 2));
  
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
  
  // Group by hierarchy
  const { parentTasks: newParentTasks, childTasks: newChildTasks } = groupTasksByHierarchy(sampleTasks);
  
  // Create parent tasks first
  console.log(`Creating ${newParentTasks.length} parent tasks...`);
  const taskIdMap: Record<string, string> = {};
  const createdTasks: string[] = [];
  
  for (const task of newParentTasks) {
    try {
      // Map the status to a state ID using our mapping
      const statusKey = statusMap[task.status] || 'backlog';
      const stateId = stateMapping[statusKey];
      
      if (!stateId) {
        console.error(`Cannot find state ID for status "${task.status}" (mapped to "${statusKey}")`);
        continue;
      }
      
      const payload: IssueCreatePayload = {
        name: task.name,
        description: '',
        priority: priorityMap[task.priority || 'null'],
        state: stateId,
        assignees: task.assignees,
      };
      
      console.log(`Creating task: ${task.name} with state: ${stateId}`);
      const createdTask = await client.createIssue(payload);
      taskIdMap[task.id] = createdTask.id;
      createdTasks.push(`${task.name} (${createdTask.id})`);
      console.log(`Created parent task: ${task.name} with ID: ${createdTask.id}`);
    } catch (error) {
      console.error(`Failed to create task ${task.name}:`, error);
    }
  }
  
  // Create child tasks
  console.log(`Creating ${newChildTasks.length} child tasks...`);
  for (const task of newChildTasks) {
    try {
      // Skip if parent doesn't exist in Plane yet
      if (!taskIdMap[task.parentId!]) {
        console.warn(`Parent task ${task.parentId} not found for task ${task.name}`);
        continue;
      }
      
      // Map the status to a state ID using our mapping
      const statusKey = statusMap[task.status] || 'backlog';
      const stateId = stateMapping[statusKey];
      
      if (!stateId) {
        console.error(`Cannot find state ID for status "${task.status}" (mapped to "${statusKey}")`);
        continue;
      }
      
      const payload: IssueCreatePayload = {
        name: task.name,
        description: '',
        priority: priorityMap[task.priority || 'null'],
        state: stateId,
        assignees: task.assignees,
        parent: taskIdMap[task.parentId!],
      };
      
      console.log(`Creating child task: ${task.name} with state: ${stateId} and parent: ${taskIdMap[task.parentId!]}`);
      const createdTask = await client.createIssue(payload);
      taskIdMap[task.id] = createdTask.id;
      createdTasks.push(`${task.name} (${createdTask.id})`);
      console.log(`Created child task: ${task.name} with ID: ${createdTask.id}`);
    } catch (error) {
      console.error(`Failed to create task ${task.name}:`, error);
    }
  }
  
  // Summary of created tasks
  console.log('\n====== CREATED TASKS SUMMARY ======');
  console.log(`Successfully created ${createdTasks.length} tasks:`);
  createdTasks.forEach((task, i) => console.log(`${i+1}. ${task}`));
  console.log('==================================\n');
  
  console.log('Test import complete!');
};

// Run the test function
testImport().catch(console.error); 