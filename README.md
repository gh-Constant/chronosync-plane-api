# Plane API Client

A TypeScript client for interacting with the Plane project management API.

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in your project root with the following variables:

```env
PLANE_API_URL=your_plane_instance_url
PLANE_API_KEY=your_api_key
WORKSPACE_SLUG=your_workspace_slug
PROJECT_NAME=your_project_name
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PLANE_API_URL` | The base URL of your Plane instance | Yes |
| `PLANE_API_KEY` | Your Plane API key (with `plane_api_` prefix) | Yes |
| `WORKSPACE_SLUG` | The slug of your workspace | Yes |
| `PROJECT_NAME` | The name of your project | Yes |

## Usage

```typescript
import { PlaneClient } from './src/planeClient';

async function main() {
  // Create a new instance of the PlaneClient
  const client = new PlaneClient();

  // Initialize the client (required before using project-specific methods)
  await client.initialize();

  // Get project members
  const members = await client.getProjectMembers();
  console.log('Project members:', members);

  // Get all projects in workspace
  const projects = await client.getProjects();
  console.log('All projects:', projects);

  // Create a new issue
  const issue = await client.createIssue({
    name: "Task name",
    description: "Task description",
    priority: "high"
  });

  // Add a comment to the issue
  await client.addIssueComment(issue.id, "This is a comment");
}
```

## API Documentation

### `PlaneClient`

The main class for interacting with the Plane API.

#### Constructor

```typescript
const client = new PlaneClient();
```

Creates a new instance of the PlaneClient. Automatically loads configuration from environment variables.

**Throws:**
- `Error` if required environment variables are missing

#### Methods

### `initialize()`

```typescript
async initialize(): Promise<void>
```

Initializes the client by fetching the project ID based on the project name from environment variables.
Must be called before using project-specific methods.

**Throws:**
- `Error` if project is not found
- `Error` if API response format is unexpected
- `AxiosError` for network-related errors

### `getProjectMembers()`

```typescript
async getProjectMembers(): Promise<ProjectMember[]>
```

Gets all members of the current project.

**Returns:**
- Array of project members with their details and roles

**Throws:**
- `Error` if client is not initialized
- `AxiosError` for API-related errors

### `getProjects()`

```typescript
async getProjects(): Promise<Project[]>
```

Gets all projects in the workspace.

**Returns:**
- Array of projects with their details

**Throws:**
- `AxiosError` for API-related errors

### `getIssueStates()`

```typescript
async getIssueStates(): Promise<IssueState[]>
```

Gets all states defined for the current project.

**Returns:**
- Array of issue states with their details

**Throws:**
- `Error` if client is not initialized
- `AxiosError` for API-related errors

### `getLabels()`

```typescript
async getLabels(): Promise<Label[]>
```

Gets all labels defined for the current project.

**Returns:**
- Array of labels with their details

**Throws:**
- `Error` if client is not initialized
- `AxiosError` for API-related errors

### `getIssues()`

```typescript
async getIssues(params?: { page?: number; perPage?: number }): Promise<any>
```

Gets all issues in the current project with pagination support.

**Parameters:**
- `params.page`: Page number (default: 1)
- `params.perPage`: Number of items per page (default: 100)

**Returns:**
- Paginated list of issues

**Throws:**
- `Error` if client is not initialized
- `AxiosError` for API-related errors

### `createIssue(payload)`

```typescript
async createIssue(payload: IssueCreatePayload): Promise<any>
```

Creates a new issue in the project.

**Parameters:**

`payload`: An object containing the issue details:

```typescript
interface IssueCreatePayload {
  name: string;              // Required: Issue title
  description?: string;      // Optional: Issue description
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none';  // Optional: Issue priority
  state?: string;           // Optional: Issue state
  assignees?: string[];     // Optional: Array of assignee IDs
  labels?: string[];        // Optional: Array of label IDs
}
```

**Returns:**
- Promise resolving to the created issue data

**Throws:**
- `Error` if client is not initialized
- `AxiosError` for API-related errors

### `updateIssue()`

```typescript
async updateIssue(issueId: string, payload: Partial<IssueCreatePayload>): Promise<any>
```

Updates an existing issue.

**Parameters:**
- `issueId`: ID of the issue to update
- `payload`: Partial issue details to update

**Returns:**
- Updated issue data

**Throws:**
- `Error` if client is not initialized
- `AxiosError` for API-related errors

### `deleteIssue()`

```typescript
async deleteIssue(issueId: string): Promise<void>
```

Deletes an issue.

**Parameters:**
- `issueId`: ID of the issue to delete

**Throws:**
- `Error` if client is not initialized
- `AxiosError` for API-related errors

### `addIssueComment()`

```typescript
async addIssueComment(issueId: string, comment: string): Promise<any>
```

Adds a comment to an issue.

**Parameters:**
- `issueId`: ID of the issue
- `comment`: Comment text

**Returns:**
- Created comment data

**Throws:**
- `Error` if client is not initialized
- `AxiosError` for API-related errors

## Error Handling

The client includes comprehensive error handling and logging:

- Network errors are logged with detailed information
- API responses are intercepted and logged
- Validation errors are caught and reported
- Authentication errors are handled with clear messages

## Example

```typescript
import { PlaneClient } from './src/planeClient';

async function main() {
  try {
    const client = new PlaneClient();
    await client.initialize();
    
    // Get project members
    const members = await client.getProjectMembers();
    console.log('Project members:', members);

    // Create an issue
    const issue = await client.createIssue({
      name: "Implement new feature",
      description: "Add authentication to the API",
      priority: "high",
      labels: ["backend", "security"]
    });
    
    // Add a comment
    await client.addIssueComment(issue.id, "Started working on this");

    // Update the issue
    await client.updateIssue(issue.id, {
      state: "in_progress"
    });
    
    console.log('Issue created and updated:', issue);
  } catch (error) {
    console.error('Failed to perform operations:', error);
  }
}

main();
```

## Development

### Building the Project

```bash
npm run build
```

### Running the Example

```bash
npm run start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 