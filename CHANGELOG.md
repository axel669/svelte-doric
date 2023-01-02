## 1.9.1
- renamed Appbar and Titlebar
- changed Select style
- Select no longer crashes with no selected value by default
- updated all uses of on:tap to on:click in docs and demo site
- removed adornment component, updated components for adornment styles
    - Button
    - Flex
    - Grid
    - Text
    - TextInput
- TextInput error prop now sets extra text when non null
- TextInput validation prop added, works with error automatically
- TextInput transform prop added, works with validation

## 1.9.0

### Utils
- added onChange
- added grid util
- made hash store settable

### Components
- removed custom event code (no longer needed)
- removed ripple effect
    - replaced with pure css effect for performance
- removed Checkbox
- removed Switch
- added Toggle component
- converted on:tap to on:click in all components
- fix AppBar adornment recoloring
- ControlDrawer and Drawer heights fixed
- rebuilt TextInput to modify layout and remove number of nodes required
- List and Table body elements now get paginated item list as prop
- Grid now has areas prop for grid-template-areas
    - many components now have col, row, and area props to interact with grids

### Site
- made component list scroll independant of theme selection
- component buttons now act as links (support for ctrl+click too)
