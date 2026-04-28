[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$RepoRoot,
  [string]$CodexHome = (Join-Path $env:USERPROFILE '.codex')
)

$ErrorActionPreference = 'Stop'

function Get-AgentBody {
  param([Parameter(Mandatory = $true)][string]$Path)

  $raw = Get-Content -LiteralPath $Path -Raw
  if ($raw -match '(?s)^---\s*\r?\n.*?\r?\n---\s*\r?\n(.*)$') {
    return $Matches[1].Trim()
  }

  return $raw.Trim()
}

function Escape-TomlLiteral {
  param([AllowEmptyString()][string]$Value)

  return $Value -replace "'''", "''`"'`"''"
}

function Set-TextFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Value
  )

  if ($PSCmdlet.ShouldProcess($Path, 'write file')) {
    Set-Content -LiteralPath $Path -Value $Value -Encoding UTF8
  }
}

function Copy-Skill {
  param([Parameter(Mandatory = $true)][string]$Name)

  $src = Join-Path $RepoRoot ".github\skills\$Name"
  $dst = Join-Path (Join-Path $CodexHome 'skills') $Name

  if (-not (Test-Path -LiteralPath (Join-Path $src 'SKILL.md'))) {
    throw "Missing source skill: $src"
  }

  if ($PSCmdlet.ShouldProcess($dst, "copy Codex skill '$Name'")) {
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    Copy-Item -LiteralPath (Join-Path $src 'SKILL.md') -Destination (Join-Path $dst 'SKILL.md') -Force
  }
}

function New-AgentToml {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Description,
    [Parameter(Mandatory = $true)][string]$SourcePath,
    [Parameter(Mandatory = $true)][string[]]$Nicknames
  )

  $body = Escape-TomlLiteral (Get-AgentBody $SourcePath)
  $nicknameText = ($Nicknames | ForEach-Object { '"' + ($_ -replace '"', '\"') + '"' }) -join ', '

  return @"
name = "$Name"
description = "$Description"
model = "gpt-5.5"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
nickname_candidates = [$nicknameText]

developer_instructions = '''
$body
'''
"@
}

function Remove-McpServerBlock {
  param(
    [Parameter(Mandatory = $true)][string]$Config,
    [Parameter(Mandatory = $true)][string]$Name
  )

  $pattern = "(?ms)^\[mcp_servers\." + [regex]::Escape($Name) + "\]\r?\n.*?(?=^\[|\z)"
  return [regex]::Replace($Config, $pattern, '')
}

$agentsDir = Join-Path $CodexHome 'agents'
$skillsDir = Join-Path $CodexHome 'skills'
$configPath = Join-Path $CodexHome 'config.toml'

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

if (-not (Test-Path -LiteralPath $RepoRoot)) {
  throw "Repo root not found: $RepoRoot"
}

if (-not (Test-Path -LiteralPath $configPath)) {
  throw "Codex config not found: $configPath"
}

if ($PSCmdlet.ShouldProcess($CodexHome, 'create Codex agents and skills directories')) {
  New-Item -ItemType Directory -Force -Path $agentsDir | Out-Null
  New-Item -ItemType Directory -Force -Path $skillsDir | Out-Null
}

Copy-Skill 'clean-code'
Copy-Skill 'frontend-design'

$reviewToml = New-AgentToml `
  -Name 'code-reviewer' `
  -Description 'Expert code review specialist for quality, security, maintainability, and regression risk. Use after code changes or when asked for review.' `
  -SourcePath (Join-Path $RepoRoot '.github\agents\code-reviewer.agent.md') `
  -Nicknames @('Reviewer', 'Code Reviewer')

$plannerToml = New-AgentToml `
  -Name 'planner' `
  -Description 'Expert planning specialist for complex features, architecture changes, and refactoring. Use when asked to create or review implementation plans.' `
  -SourcePath (Join-Path $RepoRoot '.github\agents\planner.agent.md') `
  -Nicknames @('Planner', 'Planning Agent')

Set-TextFile -Path (Join-Path $agentsDir 'code-reviewer.toml') -Value $reviewToml
Set-TextFile -Path (Join-Path $agentsDir 'planner.toml') -Value $plannerToml

$copilot = (Get-Content -LiteralPath (Join-Path $RepoRoot '.github\copilot-instructions.md') -Raw).Trim()
$backend = (Get-Content -LiteralPath (Join-Path $RepoRoot '.github\instructions\backend.instructions.md') -Raw).Trim()
$frontend = (Get-Content -LiteralPath (Join-Path $RepoRoot '.github\instructions\frontend.instructions.md') -Raw).Trim()

$studentSkillDir = Join-Path $skillsDir 'student-advising-portal'
if ($PSCmdlet.ShouldProcess($studentSkillDir, 'create Student Advising Portal skill directory')) {
  New-Item -ItemType Directory -Force -Path $studentSkillDir | Out-Null
}

$studentSkill = @"
---
name: student-advising-portal
description: "Use when working in the Student Advising Portal repository or when the user explicitly asks for its project-specific Express, Sequelize, React, auth, role, deployment, or verification conventions."
---

# Student Advising Portal Project Rules

These rules are project-specific. Use them only for the Student Advising Portal repository unless the user explicitly asks to apply them elsewhere.

## General Repository Rules

$copilot

## Backend Rules

$backend

## Frontend Rules

$frontend
"@

Set-TextFile -Path (Join-Path $studentSkillDir 'SKILL.md') -Value $studentSkill

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = "$configPath.bak-$timestamp"
if ($PSCmdlet.ShouldProcess($backupPath, 'back up Codex config')) {
  Copy-Item -LiteralPath $configPath -Destination $backupPath -Force
}

$config = Get-Content -LiteralPath $configPath -Raw
foreach ($name in @('firecrawl', 'microsoftdocs', 'magic21st', 'supabase')) {
  $config = Remove-McpServerBlock -Config $config -Name $name
}

$config = $config.TrimEnd() + @"

[mcp_servers.firecrawl]
command = "npx"
args = ["-y", "firecrawl-mcp@latest"]
env_vars = ["FIRECRAWL_API_KEY"]

[mcp_servers.microsoftdocs]
url = "https://learn.microsoft.com/api/mcp"

[mcp_servers.magic21st]
command = "npx"
args = ["-y", "@21st-dev/magic@latest"]
env_vars = ["API_KEY"]

[mcp_servers.supabase]
url = "https://mcp.supabase.com/mcp"
"@

Set-TextFile -Path $configPath -Value $config

if ($WhatIfPreference) {
  Write-Host "WhatIf complete. No Codex files were changed."
} else {
  Write-Host "Migration complete."
}
Write-Host "Codex home: $CodexHome"
Write-Host "Config backup: $backupPath"
Write-Host "Restart Codex to load new skills and custom agents."
