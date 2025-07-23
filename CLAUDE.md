# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the CoPilotLogParser project - a tool for processing and analyzing agent execution logs from automated testing systems. The repository contains JSON log files that capture detailed execution traces of AI agents performing automated SAP testing workflows.

## Log File Structure

The project contains two types of log files in the `debug/` directory:

### Full Logs (`agent_logs.json`)
- Complete execution traces with thoughts, descriptions, actions, and observations
- Contains session metadata, instructions, and worksteps
- Includes detailed action sequences with timestamps and execution results
- Captures UI automation scripts (visionscript) for SAP interactions

### Filtered Logs (`filtered_agent_logs.json`) 
- Condensed version focusing on test steps and observations
- Removes verbose metadata while preserving essential execution flow
- Structured around test step descriptions and their corresponding observations

## Log Content Analysis

The logs capture:
- **SAP Testing Workflows**: Automated sales order creation processes (VA01 transactions)
- **Agent Decision Making**: Reasoning, thoughts, and confirmation requirements
- **UI Automation**: VisionScript commands for browser and SAP GUI interactions
- **Test Data Management**: Field values, table entries, and validation results
- **Execution Timing**: Precise timestamps for each action and observation

## Data Security Note

These logs contain test data for SAP systems including usernames and system configurations. All data appears to be for testing/demo purposes only and does not contain production credentials or sensitive business information.

## Development Context

This appears to be part of a larger test automation framework where AI agents execute predefined test scenarios against SAP systems, with comprehensive logging for analysis and debugging purposes.