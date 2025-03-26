import { PlaneClient } from './planeClient';

async function main() {
  const client = new PlaneClient();
  
  try {
    // Initialize the client (this will fetch the project ID)
    await client.initialize();

    // Create the amogus task with high priority
    const task = await client.createIssue({
      name: 'amogus',
      priority: 'high',
      description: 'amogus',
     
    });

    console.log('Task created successfully:', task);
  } catch (error) {
    console.error('Failed to create task:', error);
  }
}

main(); 