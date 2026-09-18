import type { Request, Response, NextFunction } from 'express';
import { actorOf } from '../lib/auth';
import { canManageTeam, canMutateWorkspace, isAgencyStaff, type PortalActor } from '../lib/access';

/**
 * Middleware to ensure the user can mutate workspace data
 * (agency admin or agency member only)
 */
export function requireWorkspaceAccess(req: Request, res: Response, next: NextFunction): void {
  const actor = actorOf(req);
  if (!canMutateWorkspace(actor)) {
    res.status(403).json({ error: 'This action is limited to agency team members' });
    return;
  }
  next();
}

/**
 * Middleware to ensure the user can manage team members
 * (agency admin only)
 */
export function requireTeamManagement(req: Request, res: Response, next: NextFunction): void {
  const actor = actorOf(req);
  if (!canManageTeam(actor)) {
    res.status(403).json({ error: 'This action is limited to agency admins' });
    return;
  }
  next();
}

/**
 * Middleware to ensure the user can access a specific project
 * Checks agency ownership and project access permissions
 */
export function requireProjectAccess(req: Request, res: Response, next: NextFunction): void {
  const actor = actorOf(req);
  const projectId = req.params.id || req.params.projectId;
  
  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  // Agency staff can access all projects in their agency
  if (isAgencyStaff(actor)) {
    // Additional agency-level check should be done in the route handler
    next();
    return;
  }

  // Clients can only access their invited projects
  if (!actor.projectIds.includes(projectId)) {
    res.status(403).json({ error: 'You do not have access to this project' });
    return;
  }

  next();
}

/**
 * Middleware to ensure the user can access client data
 * Agency staff can access all clients, clients only their own
 */
export function requireClientAccess(req: Request, res: Response, next: NextFunction): void {
  const actor = actorOf(req);
  const clientId = req.params.id || req.params.clientId;
  
  if (!clientId) {
    res.status(400).json({ error: 'Client ID is required' });
    return;
  }

  // Agency staff can access all clients in their agency
  if (isAgencyStaff(actor)) {
    next();
    return;
  }

  // Clients can only access their own client data
  if (actor.clientId !== clientId) {
    res.status(403).json({ error: 'You do not have access to this client data' });
    return;
  }

  next();
}

/**
 * Middleware to add role-based filters to queries
 * This modifies the request object to include role-based constraints
 */
export function addRoleBasedFilters(req: Request, res: Response, next: NextFunction): void {
  const actor = actorOf(req);
  
  // Add actor to request for use in route handlers
  req.roleActor = actor;
  
  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      roleActor?: PortalActor;
    }
  }
}

export {};
