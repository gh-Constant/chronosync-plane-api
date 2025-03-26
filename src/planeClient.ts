import axios, { AxiosInstance, AxiosError } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Interface representing the payload for creating an issue
 * @interface IssueCreatePayload
 */
interface IssueCreatePayload {
  /** The title/name of the issue */
  name: string;
  /** Optional description of the issue */
  description?: string;
  /** Optional priority level of the issue */
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none';
  /** Optional state of the issue */
  state?: string;
  /** Optional array of assignee IDs */
  assignees?: string[];
  /** Optional array of label IDs */
  labels?: string[];
}

/**
 * Client for interacting with the Plane project management API
 * @class PlaneClient
 */
export class PlaneClient {
  private client: AxiosInstance;
  private workspaceSlug: string;
  private projectId?: string;

  /**
   * Creates an instance of PlaneClient.
   * @throws {Error} When required environment variables are missing
   */
  constructor() {
    if (!process.env.PLANE_API_URL || !process.env.PLANE_API_KEY || !process.env.WORKSPACE_SLUG) {
      throw new Error('Missing required environment variables');
    }

    this.workspaceSlug = process.env.WORKSPACE_SLUG;
    
    // Log configuration for debugging
    console.log('Initializing Plane client with:', {
      baseURL: process.env.PLANE_API_URL,
      workspaceSlug: this.workspaceSlug,
      apiKeyLength: process.env.PLANE_API_KEY.length
    });

    this.client = axios.create({
      baseURL: process.env.PLANE_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.PLANE_API_KEY
      }
    });

    // Add response interceptor for debugging
    this.client.interceptors.response.use(
      response => {
        console.log('Response Headers:', response.headers);
        return response;
      },
      error => {
        if (error.response) {
          console.error('Error Response:', {
            status: error.response.status,
            headers: error.response.headers,
            data: error.response.data
          });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Initializes the client by fetching and setting the project ID
   * Must be called before creating issues
   * @throws {Error} When project is not found or API response format is unexpected
   * @throws {AxiosError} When network or API errors occur
   */
  async initialize() {
    try {
      console.log('Fetching projects...');
      const response = await this.client.get(`/api/v1/workspaces/${this.workspaceSlug}/projects/`);
      
      console.log('API Response:', JSON.stringify(response.data, null, 2));
      
      const projects = response.data.results || response.data;
      if (!Array.isArray(projects)) {
        console.error('Unexpected response format:', response.data);
        throw new Error('Unexpected API response format');
      }

      console.log('Found projects:', projects.map(p => p.name));
      
      const project = projects.find((p: any) => p.name === process.env.PROJECT_NAME);
      if (!project) {
        throw new Error(`Project ${process.env.PROJECT_NAME} not found`);
      }

      this.projectId = project.id;
      console.log('Selected project ID:', this.projectId);
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Network error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  }

  /**
   * Creates a new issue in the project
   * @param {IssueCreatePayload} payload - The issue details
   * @returns {Promise<any>} The created issue data
   * @throws {Error} When client is not initialized
   * @throws {AxiosError} When network or API errors occur
   */
  async createIssue(payload: IssueCreatePayload) {
    if (!this.projectId) {
      throw new Error('Client not initialized. Call initialize() first');
    }

    try {
      console.log('Creating issue with payload:', payload);
      const response = await this.client.post(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${this.projectId}/issues/`,
        payload
      );
      console.log('Issue created successfully:', response.data);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Failed to create issue:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      throw error;
    }
  }
} 