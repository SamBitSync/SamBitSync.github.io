import { visit } from 'unist-util-visit';

/**
 * Rehype plugin to wrap h2 sections in div containers
 * This makes styling sections as cards much cleaner
 */
export function rehypeSectionWrapper() {
  return (tree) => {
    const sectionsToWrap = [];

    // Find all h2 elements and collect their following siblings
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'h2' && parent && parent.children) {
        const section = {
          h2Index: index,
          parent: parent,
          elements: [node]
        };

        // Collect following siblings until next h2/h3 or end
        for (let i = index + 1; i < parent.children.length; i++) {
          const sibling = parent.children[i];
          if (sibling.type === 'element' && (sibling.tagName === 'h2' || sibling.tagName === 'h3')) {
            break;
          }
          section.elements.push(sibling);
        }

        sectionsToWrap.push(section);
      }
    });

    // Wrap sections (process in reverse to maintain indices)
    for (let i = sectionsToWrap.length - 1; i >= 0; i--) {
      const section = sectionsToWrap[i];
      const wrapper = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['section-card'] },
        children: section.elements
      };

      // Replace h2 and following siblings with wrapper
      section.parent.children.splice(
        section.h2Index,
        section.elements.length,
        wrapper
      );
    }
  };
}
