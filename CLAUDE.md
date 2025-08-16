# Claude Code Session Documentation

## Project Summary
Successfully migrated from broken Hugo zettelkasten to working Astro academic-interactive site with authentic voice reflecting actual position as research intern rather than inflated credentials.

## Key Technical Stack
- **Framework**: Astro static site generation
- **Interactivity**: HTMX for progressive enhancement
- **Typography**: Crimson Text (serif) + Inter (sans-serif)
- **Content**: Markdown with frontmatter schemas
- **Design Philosophy**: Academic-credible but naturally interactive

## Major Issues Resolved

### 1. Hugo Compatibility Problems
- **Issue**: PaperMod theme required v0.146.0+, user had v0.139.4
- **Solution**: Upgraded Hugo via package manager
- **Issue**: TOML syntax error in hugo.toml:3 with invalid escape character
- **Solution**: Fixed quote syntax in configuration

### 2. Content Collections Loading Issues
- **Issue**: Persistent "collection does not exist or is empty" errors in Astro
- **Solution**: Created static page versions and systematic cache clearing
- **Commands for fixing**: `rm -rf .astro && npm run dev` (server restart + cache clear)

### 3. Authenticity and Voice Problems
- **Issue**: Site felt "too generic academic template" with "gimmicky mode switching"
- **Solution**: Complete content rewrite with conversational tone, honest positioning
- **Key Changes**:
  - Removed forced academic/systems toggle buttons
  - Changed subtitle to "Cognitive Science Research Intern and Interpretive social science student"
  - Updated description to reflect actual work: trilingual research, Nepal perspectives, computational learning
  - Language references consistently updated to Nepali/English/Newari

## Content Architecture

### Homepage (`src/pages/index.astro`)
- Hero section: "Hi, I'm Sambit" / "Exploring incommensurable connections"
- Authentic work description instead of academic jargon
- Current work sections: Research Internship, Diploma Project, Self-Teaching

### About Page (`src/pages/about.astro`)
- Honest positioning as research intern
- Conversational but credible tone
- Real work context and learning journey

### Research Page (`src/pages/research/index.astro`)
- Static version showing only Bhimdhunga Digital Divide Storymap project
- Methodology dropdown: Mixed Methods, Experimental Cognitive Science, Computational Modeling, Interpretive Social Science, Analysis
- Updated meta counts: 1 total, 1 ongoing, 0 published projects

### Research Project (`src/content/research/bhimdhunga-digital-divide-storymap.md`)
- Comprehensive project documentation
- Methodology: ["mixed-methods", "interpretive-social-science"]
- Fellowship context and community participation approach
- Interactive digital mapping for digital divide visualization

## File Structure
```
zettelkasten-astro/
├── src/
│   ├── layouts/BaseLayout.astro          # Core layout with academic typography
│   ├── pages/
│   │   ├── index.astro                   # Homepage with authentic voice
│   │   ├── about.astro                   # About page with honest positioning
│   │   ├── research/
│   │   │   └── index.astro               # Research page (static, Bhimdhunga only)
│   │   └── research-static.astro         # Working static version (backup)
│   └── content/
│       └── research/
│           └── bhimdhunga-digital-divide-storymap.md
├── CLAUDE.md                             # This documentation
└── [standard Astro project files]
```

## Commands for Development

### Start Development Server
```bash
cd /mnt/c/Users/rimal/code_w/zettelkasten-astro
npm run dev
```

### Fix Cache/Loading Issues
```bash
rm -rf .astro && npm run dev
```

### Hard Browser Refresh
- Ctrl+F5 or Ctrl+Shift+R
- Clear browser cache if changes not reflecting

## Session 2 Updates (Filtering Implementation Attempt)

### Additional Work Completed
1. **Research Page Content Restored**: Added static Bhimdhunga project content back to main research page (`/research`)
2. **Filtering Attempts**: Multiple approaches tried to implement working filter dropdowns
3. **API Endpoint Creation**: Attempted server-side filtering with HTMX and Astro API routes
4. **Client-side Filtering**: Implemented JavaScript-based filtering with data attributes

### Current Blocking Issues

#### Primary Blocker: Research Page Filtering Not Functional
- **Problem**: Filter dropdowns (Status/Methodology) are not working on main research page (`/research`)
- **Expected Behavior**: Selecting filters should show/hide Bhimdhunga project based on criteria
- **Current State**: Content displays but filtering has no effect
- **Working Comparison**: `/research-static` shows content correctly but also lacks filtering

#### Technical Attempts Made
1. **HTMX Server-side Approach**:
   - Created `/api/research/filter.ts` and `/api/research/filter.astro` endpoints
   - Added HTMX attributes to select elements
   - **Failed**: API endpoints returned 404, Astro routing issues

2. **JavaScript Client-side Approach**:
   - Implemented data attribute filtering with `data-status` and `data-methodology`
   - Added event listeners for dropdown changes
   - **Status**: Implemented but not functioning (JavaScript may not be executing)

3. **Static HTML + Progressive Enhancement**:
   - Added static content with data attributes for filtering
   - Simplified JavaScript to show/hide existing elements
   - **Status**: Content shows but filtering inactive

### Root Cause Analysis Needed
- **JavaScript Execution**: Script tags may not be running properly in Astro
- **Event Binding**: DOM elements might not be available when event listeners attach
- **Browser Console**: Need to check for JavaScript errors in browser dev tools
- **Astro Build Process**: Client-side scripts might need different configuration

## TODO for Next Session

### Critical Priority - Fix Filtering
1. **Debug JavaScript execution**: Check browser console for errors on `/research` page
2. **Verify DOM ready state**: Ensure elements exist before adding event listeners
3. **Test simple script**: Add `console.log()` to verify JavaScript is running
4. **Try alternative approach**: Consider inline event handlers or different script placement

### Immediate Priority
5. **Content collections debug**: Still need to resolve Astro content collection loading
6. **Individual project pages**: Create detail pages for research projects
7. **Replace static workarounds**: Once collections work, implement dynamic content

### Content Development
8. **Add more research projects**: Expand beyond Bhimdhunga with other work
9. **Create frameworks collection**: Add learning frameworks and methodologies
10. **Populate notes collection**: Add zettelkasten-style notes and thoughts

### Technical Enhancements
11. **Add connection mapping**: Implement the connections feature between projects/notes
12. **Mobile optimization**: Test and improve responsive design
13. **Performance testing**: Verify site loads and functions properly

### Debugging Commands for Next Session
```bash
# Start dev server with cache clear
cd /mnt/c/Users/rimal/code_w/zettelkasten-astro
rm -rf .astro && npm run dev

# Check file permissions
ls -la src/pages/research/

# Verify content exists
cat src/content/research/bhimdhunga-digital-divide-storymap.md
```

### Files Status
- **Working**: `/research-static` - shows content, no filtering
- **Broken**: `/research` - content restored but filtering not functional 
- **Working**: Homepage, About page, all static content
- **Issues**: All dynamic content collections still failing

## User Experience Notes
- User confirmed `/research-static` shows content properly
- User confirmed main `/research` page shows no content or non-functional filtering
- Content display is working, interactivity is the remaining blocker

---

## Session 3 Updates (Notes Implementation & Content Collections Issue)

### Major Success: Notes System Implemented
1. **Created Notes Page**: `/notes` with filtering functionality (type and confidence filters)
2. **Added Critical Realism Note**: Comprehensive note on Roy Bhaskar's framework with connections to research methodology
3. **Linked About Page**: "critical realist synthesis" now links to detailed note
4. **Both Notes Working**: Critical realism and emergence vs reduction notes fully accessible

### Critical Discovery: Astro v5.x Content Collections Bug

#### The Core Problem
- **Astro Version**: v5.13.0 has a confirmed race condition bug affecting content collections
- **Error Message**: "The collection 'notes' does not exist or is empty" despite files existing
- **Windows-Specific**: Particularly affects Windows systems (which user is on - WSL2)
- **Development vs Production**: Collections fail in dev mode but often work in builds

#### Root Cause Analysis
Based on GitHub issues research:
- **Race condition**: Data store loads empty before schemas can validate
- **Timing issue**: Collections try to validate before content is loaded  
- **Known bug**: Issues #12784, #13118, #12652 in Astro repository
- **Active problem**: Affects v5.0.9 through v5.13.0

#### Implemented Workaround
- **Static Pages**: Created individual `.astro` files for each note instead of dynamic routing
- **Disabled Dynamic Route**: Moved `[...slug].astro` to `[...slug].astro.disabled`
- **Manual Content**: Copied markdown content into static Astro components
- **Full Functionality**: Maintains all features (styling, navigation, metadata)

#### Impact on Workflow
**Problem for Adding Notes**:
- Can't use simple markdown files anymore
- Must create full Astro components for each note
- No automatic routing from content collections
- Manual maintenance of note listings

**Current Workaround Process**:
1. Create `/pages/notes/[note-name].astro` file
2. Copy content from markdown files manually
3. Update notes index page manually
4. Restart server for changes to take effect

### Files Status After Session 3
- **Working**: All static pages, research page, about page, notes listing
- **Working**: Individual note pages via static implementation
- **Working**: Cross-page links (about → critical realism note)
- **Blocked**: Dynamic content collections (known Astro bug)
- **Workaround**: Static page implementation for notes

### Next Steps for Future Sessions
1. **Monitor Astro Updates**: Check for fixes to content collections in newer versions
2. **Alternative Approaches**: Consider Hugo migration or different content management
3. **Automation**: Create script to generate Astro pages from markdown files
4. **Documentation**: Maintain list of notes that need static page creation

### Technical Debt Created
- **Manual note management**: Each note requires Astro component creation
- **No dynamic routing**: Static pages only
- **Update complexity**: Changes require manual propagation
- **Scale limitations**: Adding many notes becomes cumbersome

### Immediate Next Session Priority
**Create helper script or process** to make note creation easier while content collections remain broken.

---

Last updated: Session 3 completion  
Critical blocker: **Astro v5.x content collections race condition bug**  
Next session priority: **Implement easier note creation workflow despite collections bug**