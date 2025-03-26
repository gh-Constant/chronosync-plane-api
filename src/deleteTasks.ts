// deleteTasks.ts
import { PlaneClient } from './planeClient';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 5000;
const RETRY_AFTER_BUFFER_MS = 1000;

/**
 * Creates a delay for the specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deleteAllTasks() {
  console.log('Starting task deletion process...');

  let client: PlaneClient;
  try {
    client = new PlaneClient();
    console.log('PlaneClient instantiated.');
    await client.initialize();
    console.log(`Client initialized for project ID: ${client['projectId']}`);
  } catch (error) {
    console.error('Failed to initialize PlaneClient:', error);
    process.exit(1);
  }

  // Fetch all issues for the project
  console.log('Fetching all tasks...');
  
  try {
    const response = await client.getIssues({ perPage: 100 }); // Get up to 100 issues at once
    
    // Handle both array response and paginated response with 'results' property
    const issues = Array.isArray(response) ? response : (response.results || []);
    
    if (!issues || issues.length === 0) {
      console.log('No tasks found to delete.');
      return;
    }
    
    console.log(`Found ${issues.length} tasks to delete.`);
    
    // Delete each issue
    for (const issue of issues) {
      let retries = 0;
      let success = false;
      
      while (retries < MAX_RETRIES && !success) {
        try {
          if (retries > 0) {
            console.log(`[Retry ${retries}/${MAX_RETRIES}] Attempting to delete task: "${issue.name}" (ID: ${issue.id})`);
          } else {
            console.log(`Attempting to delete task: "${issue.name}" (ID: ${issue.id})`);
          }
          
          await client.deleteIssue(issue.id);
          console.log(`Successfully deleted task: "${issue.name}" (ID: ${issue.id})`);
          success = true;
          
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 429) {
            retries++;
            const retryAfterHeader = error.response.headers['retry-after'];
            let waitTimeSeconds = DEFAULT_RETRY_DELAY_MS / 1000;

            if (retryAfterHeader && !isNaN(parseInt(retryAfterHeader, 10))) {
              waitTimeSeconds = parseInt(retryAfterHeader, 10);
              console.warn(`Rate limit hit for deleting task "${issue.name}". API suggests retry after ${waitTimeSeconds} seconds.`);
            } else {
              console.warn(`Rate limit hit for deleting task "${issue.name}". No valid Retry-After header found. Using default delay ${waitTimeSeconds} seconds.`);
            }

            const waitTimeMs = (waitTimeSeconds * 1000) + RETRY_AFTER_BUFFER_MS;

            if (retries >= MAX_RETRIES) {
              console.error(`[FAIL] Max retries (${MAX_RETRIES}) reached for deleting task "${issue.name}" after rate limit.`);
              break;
            } else {
              console.log(`Waiting ${waitTimeMs / 1000} seconds before retrying...`);
              await delay(waitTimeMs);
            }
          } else {
            // Non-rate-limit error
            if (axios.isAxiosError(error)) {
              console.error(`[FAIL] Failed to delete task "${issue.name}". Non-retryable error: ${error.message}`, error.response?.data || '');
            } else {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`[FAIL] Failed to delete task "${issue.name}". Unexpected error: ${errorMessage}`);
            }
            break;
          }
        }
      }
      
      // Optional: Add a small delay between requests to avoid hammering the API
      await delay(500);
    }
    
    console.log('Task deletion process finished.');
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Failed to fetch tasks:', error.message, error.response?.data || '');
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to fetch tasks:', errorMessage);
    }
    process.exit(1);
  }
}

// Run the main function
deleteAllTasks().catch(error => {
  console.error('Unhandled error during task deletion process:', error);
  process.exit(1);
}); 