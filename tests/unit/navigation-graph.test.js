import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NavigationNode,
  NavigationEdge,
  NavigationGraph,
  createNodeId
} from '../../src/v2/navigation-graph.js';

describe('NavigationNode', () => {
  describe('constructor', () => {
    it('should create a node with required properties', () => {
      const node = new NavigationNode('node-1', {
        url: 'https://example.com',
        title: 'Example Page'
      });
      
      expect(node.id).toBe('node-1');
      expect(node.url).toBe('https://example.com');
      expect(node.title).toBe('Example Page');
      expect(node.parent).toBeNull();
      expect(node.depth).toBe(0);
      expect(node.visitCount).toBe(0);
      expect(node.children).toBeInstanceOf(Set);
      expect(node.children.size).toBe(0);
      expect(node.siblings).toBeInstanceOf(Set);
      expect(node.siblings.size).toBe(0);
      expect(node.exploredLinks).toEqual([]);
      expect(node.unexploredLinks).toEqual([]);
      expect(node.isLeaf).toBe(false);
    });

    it('should accept parent and depth', () => {
      const node = new NavigationNode('child-1', {
        url: 'https://example.com/child',
        parent: 'parent-1',
        depth: 2
      });
      
      expect(node.parent).toBe('parent-1');
      expect(node.depth).toBe(2);
    });

    it('should accept metadata', () => {
      const node = new NavigationNode('node-1', {
        url: 'https://example.com',
        metadata: { isNavigation: true, category: 'product' }
      });
      
      expect(node.metadata.isNavigation).toBe(true);
      expect(node.metadata.category).toBe('product');
    });
  });

  describe('markLinkExplored', () => {
    it('should move link from unexplored to explored', () => {
      const node = new NavigationNode('node-1');
      node.unexploredLinks = [
        { text: 'Features', selector: '#features' },
        { text: 'Pricing', selector: '#pricing' }
      ];
      
      node.markLinkExplored({ text: 'Features', selector: '#features' });
      
      expect(node.unexploredLinks).toHaveLength(1);
      expect(node.exploredLinks).toHaveLength(1);
      expect(node.exploredLinks[0].text).toBe('Features');
    });

    it('should handle link not found gracefully', () => {
      const node = new NavigationNode('node-1');
      node.unexploredLinks = [{ text: 'Features' }];
      
      // When link is not found, nothing changes
      node.markLinkExplored({ text: 'NotExisting' });
      
      // Original link should still be unexplored
      expect(node.unexploredLinks).toHaveLength(1);
      expect(node.unexploredLinks[0].text).toBe('Features');
      expect(node.exploredLinks).toHaveLength(0);
    });
  });

  describe('children and siblings', () => {
    it('should add and remove children', () => {
      const node = new NavigationNode('parent');
      
      node.addChild('child-1');
      node.addChild('child-2');
      
      expect(node.children.size).toBe(2);
      expect(node.children.has('child-1')).toBe(true);
      expect(node.children.has('child-2')).toBe(true);
      
      node.removeChild('child-1');
      
      expect(node.children.size).toBe(1);
      expect(node.children.has('child-1')).toBe(false);
    });

    it('should add siblings but not self', () => {
      const node = new NavigationNode('node-1');
      
      node.addSibling('node-2');
      node.addSibling('node-1'); // Should not add self
      
      expect(node.siblings.size).toBe(1);
      expect(node.siblings.has('node-2')).toBe(true);
      expect(node.siblings.has('node-1')).toBe(false);
    });
  });

  describe('recordVisit', () => {
    it('should increment visit count and set timestamps', () => {
      const node = new NavigationNode('node-1');
      
      expect(node.visitCount).toBe(0);
      expect(node.firstVisitedAt).toBeNull();
      
      node.recordVisit();
      
      expect(node.visitCount).toBe(1);
      expect(node.firstVisitedAt).toBeDefined();
      expect(node.lastVisitedAt).toBeDefined();
      
      const firstVisit = node.firstVisitedAt;
      
      node.recordVisit();
      
      expect(node.visitCount).toBe(2);
      expect(node.firstVisitedAt).toBe(firstVisit);
      expect(node.lastVisitedAt).toBeGreaterThanOrEqual(firstVisit);
    });
  });

  describe('hasUnexploredLinks', () => {
    it('should return true when there are unexplored links', () => {
      const node = new NavigationNode('node-1');
      node.unexploredLinks = [{ text: 'Link 1' }];
      
      expect(node.hasUnexploredLinks()).toBe(true);
    });

    it('should return false when no unexplored links', () => {
      const node = new NavigationNode('node-1');
      
      expect(node.hasUnexploredLinks()).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const node = new NavigationNode('node-1', {
        url: 'https://example.com',
        title: 'Test',
        parent: 'parent-1',
        depth: 1
      });
      node.addChild('child-1');
      node.unexploredLinks = [{ text: 'Link' }];
      node.recordVisit();
      
      const json = node.toJSON();
      
      expect(json.id).toBe('node-1');
      expect(json.url).toBe('https://example.com');
      expect(json.title).toBe('Test');
      expect(json.parent).toBe('parent-1');
      expect(json.depth).toBe(1);
      expect(json.children).toContain('child-1');
      expect(json.unexploredLinks).toHaveLength(1);
      expect(json.visitCount).toBe(1);
    });

    it('should deserialize from JSON', () => {
      const json = {
        id: 'node-1',
        url: 'https://example.com',
        title: 'Test',
        parent: 'parent-1',
        children: ['child-1', 'child-2'],
        siblings: ['sibling-1'],
        depth: 2,
        visitCount: 3,
        unexploredLinks: [{ text: 'Link' }],
        isLeaf: true
      };
      
      const node = NavigationNode.fromJSON(json);
      
      expect(node.id).toBe('node-1');
      expect(node.url).toBe('https://example.com');
      expect(node.children.size).toBe(2);
      expect(node.siblings.size).toBe(1);
      expect(node.visitCount).toBe(3);
      expect(node.isLeaf).toBe(true);
    });
  });
});

describe('NavigationEdge', () => {
  describe('constructor', () => {
    it('should create an edge with from and to', () => {
      const edge = new NavigationEdge('node-1', 'node-2');
      
      expect(edge.fromId).toBe('node-1');
      expect(edge.toId).toBe('node-2');
      expect(edge.type).toBe('click');
      expect(edge.traverseCount).toBe(0);
    });

    it('should accept metadata', () => {
      const edge = new NavigationEdge('node-1', 'node-2', {
        via: { text: 'Features', selector: '#features' },
        type: 'spa'
      });
      
      expect(edge.via.text).toBe('Features');
      expect(edge.type).toBe('spa');
    });
  });

  describe('recordTraversal', () => {
    it('should increment traverse count', () => {
      const edge = new NavigationEdge('node-1', 'node-2');
      
      expect(edge.traverseCount).toBe(0);
      
      edge.recordTraversal();
      edge.recordTraversal();
      
      expect(edge.traverseCount).toBe(2);
    });
  });
});

describe('NavigationGraph', () => {
  let graph;

  beforeEach(() => {
    graph = new NavigationGraph();
  });

  describe('addNode', () => {
    it('should add a node to the graph', () => {
      const node = new NavigationNode('node-1', { url: 'https://example.com' });
      
      graph.addNode(node);
      
      expect(graph.size).toBe(1);
      expect(graph.getNode('node-1')).toBe(node);
    });

    it('should throw if not a NavigationNode instance', () => {
      expect(() => graph.addNode({ id: 'fake' }))
        .toThrow('Must provide a NavigationNode instance');
    });

    it('should update existing node on duplicate', () => {
      const node1 = new NavigationNode('node-1', { url: 'https://example.com' });
      const node2 = new NavigationNode('node-1', { url: 'https://example.com/different' });
      
      graph.addNode(node1);
      graph.addNode(node2);
      
      expect(graph.size).toBe(1);
      expect(graph.getNode('node-1').visitCount).toBe(1);
    });

    it('should set up parent-child relationships', () => {
      const parent = new NavigationNode('parent', { url: 'https://example.com' });
      const child = new NavigationNode('child', { 
        url: 'https://example.com/child',
        parent: 'parent',
        depth: 1
      });
      
      graph.addNode(parent);
      graph.addNode(child);
      
      expect(parent.children.has('child')).toBe(true);
    });

    it('should set up sibling relationships', () => {
      const parent = new NavigationNode('parent', { url: 'https://example.com' });
      const child1 = new NavigationNode('child-1', { 
        url: 'https://example.com/child1',
        parent: 'parent',
        depth: 1
      });
      const child2 = new NavigationNode('child-2', { 
        url: 'https://example.com/child2',
        parent: 'parent',
        depth: 1
      });
      
      graph.addNode(parent);
      graph.addNode(child1);
      graph.addNode(child2);
      
      expect(child1.siblings.has('child-2')).toBe(true);
      expect(child2.siblings.has('child-1')).toBe(true);
    });
  });

  describe('addEdge', () => {
    beforeEach(() => {
      graph.addNode(new NavigationNode('node-1', { url: 'https://example.com' }));
      graph.addNode(new NavigationNode('node-2', { url: 'https://example.com/page2' }));
    });

    it('should add an edge between nodes', () => {
      const edge = graph.addEdge('node-1', 'node-2');
      
      expect(edge.fromId).toBe('node-1');
      expect(edge.toId).toBe('node-2');
      expect(graph.edgeCount).toBe(1);
    });

    it('should throw if source node not found', () => {
      expect(() => graph.addEdge('nonexistent', 'node-2'))
        .toThrow('Source node nonexistent not found');
    });

    it('should throw if target node not found', () => {
      expect(() => graph.addEdge('node-1', 'nonexistent'))
        .toThrow('Target node nonexistent not found');
    });

    it('should update existing edge on duplicate', () => {
      graph.addEdge('node-1', 'node-2');
      const edge = graph.addEdge('node-1', 'node-2');
      
      expect(graph.edgeCount).toBe(1);
      expect(edge.traverseCount).toBe(1);
    });
  });

  describe('setRoot', () => {
    it('should set the root node', () => {
      const node = new NavigationNode('root', { url: 'https://example.com' });
      node.depth = 5; // Should be reset to 0
      
      graph.addNode(node);
      graph.setRoot('root');
      
      expect(graph.rootId).toBe('root');
      expect(graph.getRoot()).toBe(node);
      expect(node.depth).toBe(0);
    });

    it('should throw if node not found', () => {
      expect(() => graph.setRoot('nonexistent'))
        .toThrow('Node nonexistent not found');
    });
  });

  describe('removeNode', () => {
    beforeEach(() => {
      graph.addNode(new NavigationNode('parent', { url: 'https://example.com' }));
      graph.addNode(new NavigationNode('child', { 
        url: 'https://example.com/child',
        parent: 'parent'
      }));
      graph.addEdge('parent', 'child');
    });

    it('should remove node and its edges', () => {
      graph.removeNode('child');
      
      expect(graph.size).toBe(1);
      expect(graph.getNode('child')).toBeUndefined();
      expect(graph.edgeCount).toBe(0);
    });

    it('should remove from parent children', () => {
      graph.removeNode('child');
      
      const parent = graph.getNode('parent');
      expect(parent.children.has('child')).toBe(false);
    });

    it('should handle removing nonexistent node', () => {
      graph.removeNode('nonexistent');
      expect(graph.size).toBe(2);
    });
  });

  describe('graph queries', () => {
    beforeEach(() => {
      // Create a tree structure:
      //        root
      //       /    \
      //    child1  child2
      //      |
      //   grandchild
      graph.addNode(new NavigationNode('root', { url: 'https://example.com' }));
      graph.addNode(new NavigationNode('child1', { 
        url: 'https://example.com/c1', 
        parent: 'root',
        depth: 1
      }));
      graph.addNode(new NavigationNode('child2', { 
        url: 'https://example.com/c2',
        parent: 'root',
        depth: 1
      }));
      graph.addNode(new NavigationNode('grandchild', { 
        url: 'https://example.com/gc',
        parent: 'child1',
        depth: 2
      }));
      
      graph.setRoot('root');
      graph.addEdge('root', 'child1');
      graph.addEdge('root', 'child2');
      graph.addEdge('child1', 'grandchild');
    });

    describe('getParent', () => {
      it('should return parent node', () => {
        const parent = graph.getParent('child1');
        expect(parent.id).toBe('root');
      });

      it('should return undefined for root', () => {
        expect(graph.getParent('root')).toBeUndefined();
      });
    });

    describe('getChildren', () => {
      it('should return child nodes', () => {
        const children = graph.getChildren('root');
        expect(children).toHaveLength(2);
        expect(children.map(c => c.id)).toContain('child1');
        expect(children.map(c => c.id)).toContain('child2');
      });

      it('should return empty array for leaf', () => {
        expect(graph.getChildren('grandchild')).toHaveLength(0);
      });
    });

    describe('getSiblings', () => {
      it('should return sibling nodes', () => {
        const siblings = graph.getSiblings('child1');
        expect(siblings).toHaveLength(1);
        expect(siblings[0].id).toBe('child2');
      });
    });

    describe('getDepth', () => {
      it('should return correct depth', () => {
        expect(graph.getDepth('root')).toBe(0);
        expect(graph.getDepth('child1')).toBe(1);
        expect(graph.getDepth('grandchild')).toBe(2);
      });

      it('should return -1 for nonexistent node', () => {
        expect(graph.getDepth('nonexistent')).toBe(-1);
      });
    });

    describe('getPath', () => {
      it('should return path between nodes', () => {
        const path = graph.getPath('root', 'grandchild');
        expect(path).toEqual(['root', 'child1', 'grandchild']);
      });

      it('should return single-node path for same node', () => {
        expect(graph.getPath('root', 'root')).toEqual(['root']);
      });

      it('should return empty for unreachable nodes', () => {
        graph.addNode(new NavigationNode('isolated', { url: 'https://other.com' }));
        expect(graph.getPath('root', 'isolated')).toEqual([]);
      });

      it('should find path going back through parent', () => {
        const path = graph.getPath('grandchild', 'root');
        expect(path).toEqual(['grandchild', 'child1', 'root']);
      });
    });

    describe('getAncestors', () => {
      it('should return all ancestors', () => {
        const ancestors = graph.getAncestors('grandchild');
        expect(ancestors).toHaveLength(2);
        expect(ancestors[0].id).toBe('child1');
        expect(ancestors[1].id).toBe('root');
      });
    });

    describe('getDescendants', () => {
      it('should return all descendants', () => {
        const descendants = graph.getDescendants('root');
        expect(descendants).toHaveLength(3);
      });
    });

    describe('getNodesAtDepth', () => {
      it('should return nodes at specific depth', () => {
        const depth1 = graph.getNodesAtDepth(1);
        expect(depth1).toHaveLength(2);
      });
    });

    describe('getMaxDepth', () => {
      it('should return maximum depth', () => {
        expect(graph.getMaxDepth()).toBe(2);
      });
    });

    describe('isReachable', () => {
      it('should return true for reachable nodes', () => {
        expect(graph.isReachable('root', 'grandchild')).toBe(true);
      });

      it('should return false for unreachable nodes', () => {
        graph.addNode(new NavigationNode('isolated', { url: 'https://other.com' }));
        expect(graph.isReachable('root', 'isolated')).toBe(false);
      });
    });

    describe('wouldCreateCycle', () => {
      it('should detect potential cycles', () => {
        expect(graph.wouldCreateCycle('grandchild', 'root')).toBe(true);
      });

      it('should return false for non-cyclic edges', () => {
        graph.addNode(new NavigationNode('new-node', { url: 'https://example.com/new' }));
        expect(graph.wouldCreateCycle('root', 'new-node')).toBe(false);
      });
    });
  });

  describe('exploration state', () => {
    beforeEach(() => {
      const node1 = new NavigationNode('node-1', { url: 'https://example.com' });
      node1.unexploredLinks = [{ text: 'Link 1' }, { text: 'Link 2' }];
      
      const node2 = new NavigationNode('node-2', { url: 'https://example.com/2' });
      node2.isLeaf = true;
      
      graph.addNode(node1);
      graph.addNode(node2);
    });

    describe('getUnexploredNodes', () => {
      it('should return nodes with unexplored links', () => {
        const unexplored = graph.getUnexploredNodes();
        expect(unexplored).toHaveLength(1);
        expect(unexplored[0].id).toBe('node-1');
      });
    });

    describe('getUnexploredLinks', () => {
      it('should return unexplored links for a node', () => {
        const links = graph.getUnexploredLinks('node-1');
        expect(links).toHaveLength(2);
      });
    });

    describe('markLinkExplored', () => {
      it('should mark link as explored by text', () => {
        graph.markLinkExplored('node-1', 'Link 1');
        
        const node = graph.getNode('node-1');
        expect(node.unexploredLinks).toHaveLength(1);
        expect(node.exploredLinks).toHaveLength(1);
      });
    });

    describe('markAsLeaf', () => {
      it('should mark node as leaf', () => {
        graph.markAsLeaf('node-1');
        
        const node = graph.getNode('node-1');
        expect(node.isLeaf).toBe(true);
        expect(node.unexploredLinks).toHaveLength(0);
      });
    });
  });

  describe('traversal', () => {
    beforeEach(() => {
      graph.addNode(new NavigationNode('root', { url: 'https://example.com' }));
      graph.addNode(new NavigationNode('child1', { 
        url: 'https://example.com/c1',
        parent: 'root',
        depth: 1
      }));
      graph.addNode(new NavigationNode('child2', { 
        url: 'https://example.com/c2',
        parent: 'root',
        depth: 1
      }));
      graph.setRoot('root');
    });

    describe('bfs', () => {
      it('should traverse in breadth-first order', async () => {
        const visited = [];
        
        await graph.bfs('root', (node) => {
          visited.push(node.id);
        });
        
        expect(visited[0]).toBe('root');
        expect(visited).toContain('child1');
        expect(visited).toContain('child2');
      });

      it('should stop when visitor returns false', async () => {
        const visited = [];
        
        await graph.bfs('root', (node) => {
          visited.push(node.id);
          return visited.length < 2;
        });
        
        expect(visited).toHaveLength(2);
      });
    });

    describe('dfs', () => {
      it('should traverse in depth-first order', async () => {
        const visited = [];
        
        await graph.dfs('root', (node) => {
          visited.push(node.id);
        });
        
        expect(visited[0]).toBe('root');
        expect(visited.length).toBe(3);
      });
    });

    describe('findBestNextNode', () => {
      it('should return node with unexplored links', () => {
        const node = graph.getNode('root');
        node.unexploredLinks = [{ text: 'Link' }];
        
        const best = graph.findBestNextNode();
        
        expect(best).toBe(node);
      });

      it('should return null when no unexplored nodes', () => {
        expect(graph.findBestNextNode()).toBeNull();
      });
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      graph.addNode(new NavigationNode('root', { 
        url: 'https://example.com',
        title: 'Home'
      }));
      graph.addNode(new NavigationNode('child', { 
        url: 'https://example.com/child',
        title: 'Child',
        parent: 'root',
        depth: 1
      }));
      graph.setRoot('root');
      graph.addEdge('root', 'child', { via: { text: 'Go to child' } });
      graph.metadata.baseUrl = 'https://example.com';
    });

    describe('toJSON', () => {
      it('should export graph to JSON', () => {
        const json = graph.toJSON();
        
        expect(json.rootId).toBe('root');
        expect(json.nodes.root).toBeDefined();
        expect(json.nodes.child).toBeDefined();
        expect(json.edges).toHaveLength(1);
        expect(json.metadata.baseUrl).toBe('https://example.com');
      });
    });

    describe('fromJSON', () => {
      it('should restore graph from JSON', () => {
        const json = graph.toJSON();
        const restored = NavigationGraph.fromJSON(json);
        
        expect(restored.size).toBe(2);
        expect(restored.rootId).toBe('root');
        expect(restored.getNode('root').title).toBe('Home');
        expect(restored.edgeCount).toBe(1);
      });
    });

    describe('toMermaid', () => {
      it('should export graph as Mermaid diagram', () => {
        const mermaid = graph.toMermaid();
        
        expect(mermaid).toContain('graph TD');
        expect(mermaid).toContain('Home');
        expect(mermaid).toContain('-->');
        expect(mermaid).toContain('classDef root');
      });
    });
  });

  describe('getSummary', () => {
    it('should return graph summary', () => {
      graph.addNode(new NavigationNode('root', { url: 'https://example.com' }));
      graph.addNode(new NavigationNode('child', { 
        url: 'https://example.com/child',
        parent: 'root',
        depth: 1
      }));
      graph.setRoot('root');
      graph.getNode('root').recordVisit();
      
      const summary = graph.getSummary();
      
      expect(summary.totalNodes).toBe(2);
      expect(summary.visitedNodes).toBe(1);
      expect(summary.maxDepth).toBe(1);
      expect(summary.rootUrl).toBe('https://example.com');
    });
  });
});

describe('createNodeId', () => {
  it('should create ID from URL', () => {
    const id = createNodeId('https://example.com/page');
    expect(id).toBe('https://example.com/page');
  });

  it('should normalize trailing slashes', () => {
    const id1 = createNodeId('https://example.com/page/');
    const id2 = createNodeId('https://example.com/page');
    expect(id1).toBe(id2);
  });

  it('should include search params', () => {
    const id = createNodeId('https://example.com/page?tab=settings');
    expect(id).toContain('?tab=settings');
  });

  it('should append state hash for SPAs', () => {
    const id = createNodeId('https://example.com/app', 'abc123');
    expect(id).toBe('https://example.com/app#state:abc123');
  });

  it('should handle invalid URLs gracefully', () => {
    const id = createNodeId('not-a-url');
    expect(id).toBe('not-a-url');
  });
});

describe('SPADetector integration', () => {
  // These tests would require a Playwright page mock
  // Keeping as placeholders for integration tests
  
  it.skip('should detect SPA frameworks', async () => {
    // Would test with actual Playwright page
  });

  it.skip('should generate state hashes', async () => {
    // Would test with actual Playwright page
  });
});

describe('ExplorationStrategy integration', () => {
  describe('built-in filters', () => {
    let ExplorationStrategy;
    
    beforeAll(async () => {
      const module = await import('../../src/v2/exploration-strategy.js');
      ExplorationStrategy = module.ExplorationStrategy;
    });
    
    describe('skipExternalLinks', () => {
      it('should allow internal links', () => {
        const link = { href: 'https://example.com/features' };
        expect(ExplorationStrategy.skipExternalLinks(link)).toBe(true);
      });

      it('should skip javascript: links', () => {
        const link = { href: 'javascript:void(0)' };
        expect(ExplorationStrategy.skipExternalLinks(link)).toBe(false);
      });

      it('should handle missing href', () => {
        expect(ExplorationStrategy.skipExternalLinks({})).toBe(true);
      });
    });

    describe('skipAuthPages', () => {
      it('should skip login pages', () => {
        expect(ExplorationStrategy.skipAuthPages({ text: 'Login', href: '' })).toBe(false);
        expect(ExplorationStrategy.skipAuthPages({ text: '', href: '/signin' })).toBe(false);
      });

      it('should allow regular pages', () => {
        expect(ExplorationStrategy.skipAuthPages({ text: 'Features', href: '/features' })).toBe(true);
      });
    });

    describe('skipLegalPages', () => {
      it('should skip privacy/terms pages', () => {
        expect(ExplorationStrategy.skipLegalPages({ text: 'Privacy Policy', href: '' })).toBe(false);
        expect(ExplorationStrategy.skipLegalPages({ text: '', href: '/terms' })).toBe(false);
      });
    });

    describe('skipAssets', () => {
      it('should skip asset files', () => {
        expect(ExplorationStrategy.skipAssets({ href: 'https://example.com/file.pdf' })).toBe(false);
        expect(ExplorationStrategy.skipAssets({ href: 'https://example.com/image.jpg' })).toBe(false);
      });

      it('should allow HTML pages', () => {
        expect(ExplorationStrategy.skipAssets({ href: 'https://example.com/page' })).toBe(true);
        expect(ExplorationStrategy.skipAssets({ href: 'https://example.com/page.html' })).toBe(true);
      });
    });

    describe('createDomainFilter', () => {
      it('should create domain-specific filter', () => {
        const filter = ExplorationStrategy.createDomainFilter('example.com');
        
        expect(filter({ href: 'https://example.com/page' })).toBe(true);
        expect(filter({ href: 'https://sub.example.com/page' })).toBe(true);
        expect(filter({ href: 'https://other.com/page' })).toBe(false);
      });
    });
  });

  describe('strategy selection', () => {
    let ExplorationStrategy, ExplorationStrategyType;
    
    beforeAll(async () => {
      const module = await import('../../src/v2/exploration-strategy.js');
      ExplorationStrategy = module.ExplorationStrategy;
      ExplorationStrategyType = module.ExplorationStrategyType;
    });
    
    it('should set and get strategy', () => {
      const graph = new NavigationGraph();
      const strategy = new ExplorationStrategy(graph);
      
      strategy.setStrategy(ExplorationStrategyType.DEPTH_FIRST);
      expect(strategy.getStrategy()).toBe('depth-first');
    });

    it('should throw for unknown strategy', () => {
      const graph = new NavigationGraph();
      const strategy = new ExplorationStrategy(graph);
      
      expect(() => strategy.setStrategy('invalid'))
        .toThrow('Unknown strategy');
    });
  });

  describe('depth and node limits', () => {
    let ExplorationStrategy;
    
    beforeAll(async () => {
      const module = await import('../../src/v2/exploration-strategy.js');
      ExplorationStrategy = module.ExplorationStrategy;
    });
    
    it('should enforce depth limits', () => {
      const graph = new NavigationGraph();
      const strategy = new ExplorationStrategy(graph, { maxDepth: 2 });
      
      expect(strategy.maxDepth).toBe(2);
      
      strategy.setMaxDepth(5);
      expect(strategy.maxDepth).toBe(5);
    });

    it('should throw for invalid limits', () => {
      const graph = new NavigationGraph();
      const strategy = new ExplorationStrategy(graph);
      
      expect(() => strategy.setMaxDepth(0)).toThrow();
      expect(() => strategy.setMaxNodesPerLevel(0)).toThrow();
    });
  });
});
