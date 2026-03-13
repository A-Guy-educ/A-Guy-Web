# Graph Layout Control Feature Specification

## Overview

Enable content authors (admins) to control the visual layout and relative positioning of a graph and its accompanying explanatory text in the admin editor to optimize content presentation for students.

## Requirements

### Layout Configurations
Authors must have the ability to choose from four distinct layout relationships between the text and the graph:
1. **Text above, Graph below** - Vertical stack with text on top
2. **Text below, Graph above** - Vertical stack with graph on top
3. **Text to the right, Graph to the left** - Horizontal layout with graph on left
4. **Text to the left, Graph to the right** - Horizontal layout with text on left

### Default State
When a new graph component is created, the system must automatically apply the "Text to the right, Graph to the left" layout as the default.

### Device Responsiveness & Strict Layout
The chosen layout must be strictly respected across devices. Specifically, if a side-by-side layout (Text Left or Text Right) is selected, it must remain side-by-side on mobile devices (e.g., when the device is rotated to landscape), rather than automatically collapsing into a vertical stack.

### End-User Presentation
The selected layout configuration must be saved alongside the content and accurately dictate how the graph and text are rendered to the student in lessons or exercises.

## Acceptance Criteria

- [ ] Authors can select between the 4 layout options in the admin graph editor.
- [ ] "Text right, Graph left" is the default layout for new graphs.
- [ ] Selected layout is accurately reflected on the frontend for students.
- [ ] Side-by-side layouts remain side-by-side on mobile/landscape screens and do not force-stack vertically.
- [ ] Settings persist correctly after saving and reloading.

## Technical Notes

- The graph blocks are `QuestionAxisBlock` and `QuestionGeometryBlock` in the Exercises collection
- Layout will be added as a select field with 4 enum options
- The admin UI component for layout selection is an implementation detail (selector/dropdown/radio buttons)
- Frontend renderers must apply CSS flex/grid layout based on the stored layout value
- Mobile enforcement requires preventing responsive breakpoints from stacking side-by-side layouts
