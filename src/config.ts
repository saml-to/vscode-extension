import * as vscode from "vscode";

export type Options = {
  github: GithubOptions;
  assumeAws: AssumeAwsOptions;
};

export type GithubOptions = {
  token: string | null;
};

export type AssumeAwsOptions = {
  assumeRoleAtStartup: boolean;
  autoRefresh: boolean;
  rememberRole: RememberRole;
  region: string;
  role: string | null;
  profile: AssumeAwsProfileOptions;
};

export type ProfileName =
  | string
  | "Default Profile"
  | "Role ARN"
  | "Role Name"
  | "None";

export type AssumeAwsProfileOptions = {
  name: ProfileName;
};

export type AwsRoleSelection = {
  roleArn: string;
  provider?: string;
  org?: string;
};

class GitHubConfiguration {
  constructor(private configuration: vscode.WorkspaceConfiguration) {}

  get token(): string | null {
    return this.configuration.get<string | null>(
      "token",
      process.env.GITHUB_TOKEN || null
    );
  }
}

class AssumeAwsProfileConfiguration {
  constructor(private configuration: vscode.WorkspaceConfiguration) {}

  get name(): ProfileName {
    return this.configuration.get<ProfileName>("name", "Role ARN");
  }
}

export type RememberRole = "Workspace" | "Global" | "None";

class AssumeAwsConfiguration {
  #profile: AssumeAwsProfileConfiguration;

  constructor(
    private context: vscode.ExtensionContext,
    private configuration: vscode.WorkspaceConfiguration
  ) {
    this.#profile = new AssumeAwsProfileConfiguration(
      vscode.workspace.getConfiguration("saml-to.assumeAws.profile")
    );

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("saml-to.assumeAws.profile")) {
        this.#profile = new AssumeAwsProfileConfiguration(
          vscode.workspace.getConfiguration("saml-to.assumeAws.profile")
        );
      }
    });
  }

  get assumeRoleAtStartup(): boolean {
    return this.configuration.get<boolean>("assumeRoleAtStartup", true);
  }

  get rememberRole(): RememberRole {
    return this.configuration.get<RememberRole>("rememberRole", "None");
  }

  get autoRefresh(): boolean {
    return this.configuration.get<boolean>("autoRefresh", true);
  }

  get region(): string {
    return this.configuration.get<string>("region", "us-east-1");
  }

  get role(): string | null {
    return this.configuration.get<string | null>("role", null);
  }

  get profile(): AssumeAwsProfileConfiguration {
    return this.#profile;
  }

  get lastRoleSelection(): AwsRoleSelection | null {
    if (this.rememberRole === "Global") {
      let roleSelection = this.context.globalState.get<string | null>(
        "assumeAws.lastRoleSelection",
        null
      );
      return roleSelection ? JSON.parse(roleSelection) : null;
    }

    if (this.rememberRole === "Workspace") {
      let roleSelection = this.context.workspaceState.get<string | null>(
        "assumeAws.lastRoleSelection",
        null
      );
      return roleSelection ? JSON.parse(roleSelection) : null;
    }

    return null;
  }

  set lastRoleSelection(roleSelection: AwsRoleSelection | null) {
    if (roleSelection === null) {
      this.context.workspaceState
        .update("assumeAws.lastRoleSelection", null)
        .then(() => {});
      this.context.globalState
        .update("assumeAws.lastRoleSelection", null)
        .then(() => {});
      return;
    }

    let memento: vscode.Memento | undefined = undefined;

    if (this.rememberRole === "Global") {
      memento = this.context.globalState;
    }

    if (this.rememberRole === "Workspace") {
      memento = this.context.workspaceState;
    }

    if (memento) {
      memento
        .update("assumeAws.lastRoleSelection", JSON.stringify(roleSelection))
        .then(() => {});
    }
  }
}

export class Configuration {
  #github: GitHubConfiguration;
  #assumeAws: AssumeAwsConfiguration;

  constructor(private context: vscode.ExtensionContext) {
    this.context.globalState.setKeysForSync(["assumeAws.lastRoleSelection"]);
    this.#github = new GitHubConfiguration(
      vscode.workspace.getConfiguration("saml-to.github")
    );
    this.#assumeAws = new AssumeAwsConfiguration(
      context,
      vscode.workspace.getConfiguration("saml-to.assumeAws")
    );

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("saml-to.github")) {
        this.#github = new GitHubConfiguration(
          vscode.workspace.getConfiguration("saml-to.github")
        );
      }
      if (e.affectsConfiguration("saml-to.assumeAws")) {
        this.#assumeAws = new AssumeAwsConfiguration(
          context,
          vscode.workspace.getConfiguration("saml-to.assumeAws")
        );
      }
    });
  }

  get github(): GitHubConfiguration {
    return this.#github;
  }

  get assumeAws(): AssumeAwsConfiguration {
    return this.#assumeAws;
  }
}
