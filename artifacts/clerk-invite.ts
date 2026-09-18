import { createClerkClient } from "@clerk/backend";
import type { PortalRole } from "./access";

export async function sendClerkMagicInvite(options: {
  email: string;
  redirectUrl: string;
  role: PortalRole;
  agencyId: string;
  clientId?: string;
  projectId?: string;
}): Promise<{ success: boolean; inviteUrl?: string; error?: string }> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return { 
      success: false, 
      error: "Clerk is not configured. Magic link emails will not be sent, but the invite URL can be shared manually." 
    };
  }
  
  try {
    const clerk = createClerkClient({ secretKey });
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: options.email,
      redirectUrl: options.redirectUrl,
      publicMetadata: {
        role: options.role,
        agencyId: options.agencyId,
        clientId: options.clientId ?? null,
        projectId: options.projectId ?? null,
      },
      notify: true,
      ignoreExisting: true,
    });
    
    return { 
      success: true, 
      inviteUrl: options.redirectUrl 
    };
  } catch (error) {
    console.error("Failed to send Clerk magic invite:", error);
    return { 
      success: false, 
      error: "Failed to send magic link email. The invite URL can be shared manually.",
      inviteUrl: options.redirectUrl
    };
  }
}
