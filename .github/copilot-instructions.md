# Copilot Instructions for Estakaadi Planner

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a warehouse management web application called "Estakaadi Planner" designed for managing warehouse operations including scheduling, packaging, returns, and notes.

## Key Features
- **Bilingual Support**: Russian and Estonian languages
- **User Authentication**: Admin and regular user roles
- **Scheduling**: Delivery schedules by day of week
- **Packaging**: Track packaging operations with instructions
- **Returns**: Manage product returns
- **Notes**: User-generated notes with editing permissions
- **Photo Instructions**: Visual guides for warehouse operations

## Technical Stack
- HTML5, CSS3, JavaScript (ES6+)
- Bootstrap 5 for UI components
- JSON files for data storage
- LocalStorage for temporary data
- Responsive design for mobile devices

## Project Structure
- `/css/` - Custom stylesheets
- `/js/` - JavaScript application logic
- `/data/` - JSON data files (schedule, notes)
- `/img/` - Images and photo instructions
- `/lang/` - Language files (ru.json, ee.json)

## Coding Guidelines
- Use semantic HTML5 elements
- Follow Bootstrap conventions for responsive design
- Implement proper error handling for data operations
- Use modern JavaScript features (async/await, arrow functions)
- Maintain consistent code formatting
- Add comments for complex logic
- Ensure accessibility (ARIA labels, keyboard navigation)

## Authentication System
- Simple role-based authentication
- Admin users: "maksim", "admin" 
- Regular users have limited editing permissions
- Store user sessions in localStorage

## Data Management
- Use JSON files for persistent data
- Implement data validation
- Provide backup/restore functionality
- Log all data changes with timestamps

## Localization
- All user-facing text should be translatable
- Use language keys in JSON files
- Implement language switching functionality
- Default language: Russian, secondary: Estonian
