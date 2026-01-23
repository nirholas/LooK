/**
 * Navigation Graph - Graph-based site structure for intelligent exploration
 * 
 * Builds a hierarchical graph of website pages/states, tracks parent-child
 * relationships, and enables exploration of sub-flows with proper back navigation.
 * Handles both traditional multi-page sites and SPAs where URLs may not change.
 */

/**
 * Represents a node in the navigation graph
 * Each node corresponds to a unique page or SPA state
 */
export class NavigationNode {
  /**
   * Create a navigation node
   * @param {string} id - Unique identifier (URL or state hash for SPAs)
   * @param {Object} data - Node data
   * @param {string} data.url - Page URL
   * @param {string} [data.stateHash] - Hash of page state for SPA detection
   * @param {string} [data.title] - Page title
   * @param {string|null} [data.parent] - Parent node ID
   * @param {number} [data.depth] - Distance from root node
   * @param {Object} [data.metadata] - Additional page data
   */
  constructor(id, data = {}) {
    /** @type {string} Unique identifier */
    this.id = id;
    
    /** @type {string} Page URL */
    this.url = data.url || '';
    
    /** @type {string|null} Hash of page state for SPA detection */
    this.stateHash = data.stateHash || null;
    
    /** @type {string} Page title */
    this.title = data.title || '';
    
    /** @type {string|null} Parent node ID */
    this.parent = data.parent || null;
    
    /** @type {Set<string>} Child node IDs */
    this.children = new Set();
    
    /** @type {Set<string>} Sibling node IDs */
    this.siblings = new Set();
    
    /** @type {number} Distance from root */
    this.depth = data.depth ?? 0;
    
    /** @type {number} How many times this node was visited */
    this.visitCount = 0;
    
    /** @type {Array<Object>} Links we've already clicked */
    this.exploredLinks = [];
    
    /** @type {Array<Object>} Links we haven't clicked yet */
    this.unexploredLinks = [];
    
    /** @type {boolean} No further navigation possible from this node */
    this.isLeaf = false;
    
    /** @type {Object} Additional page data */
    this.metadata = data.metadata || {};
    
    /** @type {number} Timestamp of first visit */
    this.firstVisitedAt = null;
    
    /** @type {number} Timestamp of last visit */
    this.lastVisitedAt = null;
  }

  /**
   * Mark a link as explored
   * @param {Object} link - The link object to mark as explored
   */
  markLinkExplored(link) {
    const index = this.unexploredLinks.findIndex(l => 
      l.selector === link.selector || l.text === link.text
    );
    if (index !== -1) {
      const [explored] = this.unexploredLinks.splice(index, 1);
      this.exploredLinks.push(explored);
    }
  }

  /**
   * Add a child node
   * @param {string} childId - Child node ID
   */
  addChild(childId) {
    this.children.add(childId);
  }

  /**
   * Remove a child node
   * @param {string} childId - Child node ID
   */
  removeChild(childId) {
    this.children.delete(childId);
  }

  /**
   * Add a sibling node
   * @param {string} siblingId - Sibling node ID
   */
  addSibling(siblingId) {
    if (siblingId !== this.id) {
      this.siblings.add(siblingId);
    }
  }

  /**
   * Record a visit to this node
   */
  recordVisit() {
    this.visitCount++;
    const now = Date.now();
    if (!this.firstVisitedAt) {
      this.firstVisitedAt = now;
    }
    this.lastVisitedAt = now;
  }

  /**
   * Check if this node has unexplored links
   * @returns {boolean}
   */
  hasUnexploredLinks() {
    return this.unexploredLinks.length > 0;
  }

  /**
   * Get the number of unexplored links
   * @returns {number}
   */
  getUnexploredCount() {
    return this.unexploredLinks.length;
  }

  /**
   * Serialize node to JSON-compatible object
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      url: this.url,
      stateHash: this.stateHash,
      title: this.title,
      parent: this.parent,
      children: Array.from(this.children),
      siblings: Array.from(this.siblings),
      depth: this.depth,
      visitCount: this.visitCount,
      exploredLinks: this.exploredLinks,
      unexploredLinks: this.unexploredLinks,
      isLeaf: this.isLeaf,
      metadata: this.metadata,
      firstVisitedAt: this.firstVisitedAt,
      lastVisitedAt: this.lastVisitedAt
    };
  }

  /**
   * Create a NavigationNode from JSON data
   * @param {Object} data - JSON data
   * @returns {NavigationNode}
   */
  static fromJSON(data) {
    const node = new NavigationNode(data.id, {
      url: data.url,
      stateHash: data.stateHash,
      title: data.title,
      parent: data.parent,
      depth: data.depth,
      metadata: data.metadata
    });
    
    node.children = new Set(data.children || []);
    node.siblings = new Set(data.siblings || []);
    node.visitCount = data.visitCount || 0;
    node.exploredLinks = data.exploredLinks || [];
    node.unexploredLinks = data.unexploredLinks || [];
    node.isLeaf = data.isLeaf || false;
    node.firstVisitedAt = data.firstVisitedAt;
    node.lastVisitedAt = data.lastVisitedAt;
    
    return node;
  }
}

/**
 * Represents an edge in the navigation graph
 */
export class NavigationEdge {
  /**
   * Create a navigation edge
   * @param {string} fromId - Source node ID
   * @param {string} toId - Target node ID
   * @param {Object} [metadata] - Edge metadata
   */
  constructor(fromId, toId, metadata = {}) {
    /** @type {string} Source node ID */
    this.fromId = fromId;
    
    /** @type {string} Target node ID */
    this.toId = toId;
    
    /** @type {Object|null} The link element used for navigation */
    this.via = metadata.via || null;
    
    /** @type {string} Type of navigation: 'click', 'form', 'redirect', 'spa' */
    this.type = metadata.type || 'click';
    
    /** @type {number} Timestamp when edge was created */
    this.createdAt = Date.now();
    
    /** @type {number} Number of times this edge was traversed */
    this.traverseCount = 0;
  }

  /**
   * Record a traversal of this edge
   */
  recordTraversal() {
    this.traverseCount++;
  }

  /**
   * Serialize edge to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      fromId: this.fromId,
      toId: this.toId,
      via: this.via,
      type: this.type,
      createdAt: this.createdAt,
      traverseCount: this.traverseCount
    };
  }
}

/**
 * Graph structure for site navigation
 * Manages nodes, edges, and provides graph operations
 */
export class NavigationGraph {
  constructor() {
    /** @type {Map<string, NavigationNode>} All nodes in the graph */
    this.nodes = new Map();
    
    /** @type {Map<string, NavigationEdge[]>} Edges indexed by source node */
    this.edges = new Map();
    
    /** @type {Map<string, NavigationEdge[]>} Reverse edges indexed by target node */
    this.reverseEdges = new Map();
    
    /** @type {string|null} Root node ID */
    this.rootId = null;
    
    /** @type {Set<string>} Set of visited node IDs for cycle detection */
    this.visitedInCurrentPath = new Set();
    
    /** @type {Object} Graph-level metadata */
    this.metadata = {
      createdAt: Date.now(),
      lastModifiedAt: Date.now(),
      baseUrl: null,
      baseDomain: null
    };
  }

  // ==================== Graph Building ====================

  /**
   * Add a navigation node to the graph
   * @param {NavigationNode} node - The node to add
   * @returns {NavigationNode} The added node
   */
  addNode(node) {
    if (!(node instanceof NavigationNode)) {
      throw new Error('Must provide a NavigationNode instance');
    }
    
    // Check for duplicate
    if (this.nodes.has(node.id)) {
      // Update existing node instead of replacing
      const existing = this.nodes.get(node.id);
      existing.recordVisit();
      return existing;
    }
    
    this.nodes.set(node.id, node);
    
    // Initialize edge lists
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, []);
    }
    if (!this.reverseEdges.has(node.id)) {
      this.reverseEdges.set(node.id, []);
    }
    
    // Update parent's children list and sibling relationships
    if (node.parent && this.nodes.has(node.parent)) {
      const parent = this.nodes.get(node.parent);
      parent.addChild(node.id);
      
      // Add sibling relationships
      for (const siblingId of parent.children) {
        if (siblingId !== node.id) {
          const sibling = this.nodes.get(siblingId);
          if (sibling) {
            sibling.addSibling(node.id);
            node.addSibling(siblingId);
          }
        }
      }
    }
    
    this.metadata.lastModifiedAt = Date.now();
    return node;
  }

  /**
   * Add a navigation edge between two nodes
   * @param {string} fromId - Source node ID
   * @param {string} toId - Target node ID
   * @param {Object} [metadata] - Edge metadata
   * @returns {NavigationEdge} The created edge
   */
  addEdge(fromId, toId, metadata = {}) {
    // Ensure both nodes exist
    if (!this.nodes.has(fromId)) {
      throw new Error(`Source node ${fromId} not found`);
    }
    if (!this.nodes.has(toId)) {
      throw new Error(`Target node ${toId} not found`);
    }
    
    // Check for duplicate edge
    const existingEdges = this.edges.get(fromId) || [];
    const existing = existingEdges.find(e => e.toId === toId);
    if (existing) {
      existing.recordTraversal();
      return existing;
    }
    
    // Create and store edge
    const edge = new NavigationEdge(fromId, toId, metadata);
    
    if (!this.edges.has(fromId)) {
      this.edges.set(fromId, []);
    }
    this.edges.get(fromId).push(edge);
    
    if (!this.reverseEdges.has(toId)) {
      this.reverseEdges.set(toId, []);
    }
    this.reverseEdges.get(toId).push(edge);
    
    this.metadata.lastModifiedAt = Date.now();
    return edge;
  }

  /**
   * Set the root node of the graph
   * @param {string} nodeId - The root node ID
   */
  setRoot(nodeId) {
    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node ${nodeId} not found`);
    }
    this.rootId = nodeId;
    
    // Ensure root has depth 0
    const root = this.nodes.get(nodeId);
    root.depth = 0;
  }

  /**
   * Remove a node and all its edges
   * @param {string} nodeId - The node ID to remove
   */
  removeNode(nodeId) {
    if (!this.nodes.has(nodeId)) return;
    
    const node = this.nodes.get(nodeId);
    
    // Remove from parent's children
    if (node.parent && this.nodes.has(node.parent)) {
      this.nodes.get(node.parent).removeChild(nodeId);
    }
    
    // Remove from siblings
    for (const siblingId of node.siblings) {
      if (this.nodes.has(siblingId)) {
        this.nodes.get(siblingId).siblings.delete(nodeId);
      }
    }
    
    // Remove edges
    this.edges.delete(nodeId);
    this.reverseEdges.delete(nodeId);
    
    // Remove edges pointing to this node
    for (const [fromId, edges] of this.edges) {
      this.edges.set(fromId, edges.filter(e => e.toId !== nodeId));
    }
    
    // Remove edges from this node in reverse index
    for (const [toId, edges] of this.reverseEdges) {
      this.reverseEdges.set(toId, edges.filter(e => e.fromId !== nodeId));
    }
    
    this.nodes.delete(nodeId);
    
    if (this.rootId === nodeId) {
      this.rootId = null;
    }
    
    this.metadata.lastModifiedAt = Date.now();
  }

  // ==================== Graph Queries ====================

  /**
   * Get a node by ID
   * @param {string} id - Node ID
   * @returns {NavigationNode|undefined}
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Get the root node
   * @returns {NavigationNode|undefined}
   */
  getRoot() {
    return this.rootId ? this.nodes.get(this.rootId) : undefined;
  }

  /**
   * Get parent node
   * @param {string} nodeId - Node ID
   * @returns {NavigationNode|undefined}
   */
  getParent(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node || !node.parent) return undefined;
    return this.nodes.get(node.parent);
  }

  /**
   * Get child nodes
   * @param {string} nodeId - Node ID
   * @returns {NavigationNode[]}
   */
  getChildren(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    return Array.from(node.children)
      .map(id => this.nodes.get(id))
      .filter(Boolean);
  }

  /**
   * Get sibling nodes
   * @param {string} nodeId - Node ID
   * @returns {NavigationNode[]}
   */
  getSiblings(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    return Array.from(node.siblings)
      .map(id => this.nodes.get(id))
      .filter(Boolean);
  }

  /**
   * Get edges from a node
   * @param {string} nodeId - Node ID
   * @returns {NavigationEdge[]}
   */
  getEdgesFrom(nodeId) {
    return this.edges.get(nodeId) || [];
  }

  /**
   * Get edges to a node
   * @param {string} nodeId - Node ID
   * @returns {NavigationEdge[]}
   */
  getEdgesTo(nodeId) {
    return this.reverseEdges.get(nodeId) || [];
  }

  /**
   * Get depth of a node from root
   * @param {string} nodeId - Node ID
   * @returns {number}
   */
  getDepth(nodeId) {
    const node = this.nodes.get(nodeId);
    return node ? node.depth : -1;
  }

  /**
   * Get path between two nodes using BFS
   * @param {string} fromId - Start node ID
   * @param {string} toId - End node ID
   * @returns {string[]} Array of node IDs forming the path, or empty if no path
   */
  getPath(fromId, toId) {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      return [];
    }
    
    if (fromId === toId) {
      return [fromId];
    }
    
    const visited = new Set();
    const queue = [[fromId]];
    
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      
      if (visited.has(current)) continue;
      visited.add(current);
      
      const edges = this.edges.get(current) || [];
      for (const edge of edges) {
        if (edge.toId === toId) {
          return [...path, toId];
        }
        if (!visited.has(edge.toId)) {
          queue.push([...path, edge.toId]);
        }
      }
      
      // Also check parent (for going "back")
      const node = this.nodes.get(current);
      if (node?.parent && !visited.has(node.parent)) {
        if (node.parent === toId) {
          return [...path, toId];
        }
        queue.push([...path, node.parent]);
      }
    }
    
    return [];
  }

  /**
   * Get all ancestors of a node
   * @param {string} nodeId - Node ID
   * @returns {NavigationNode[]}
   */
  getAncestors(nodeId) {
    const ancestors = [];
    let current = this.nodes.get(nodeId);
    
    while (current && current.parent) {
      const parent = this.nodes.get(current.parent);
      if (parent) {
        ancestors.push(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    return ancestors;
  }

  /**
   * Get all descendants of a node
   * @param {string} nodeId - Node ID
   * @returns {NavigationNode[]}
   */
  getDescendants(nodeId) {
    const descendants = [];
    const stack = [...this.getChildren(nodeId)];
    
    while (stack.length > 0) {
      const node = stack.pop();
      descendants.push(node);
      stack.push(...this.getChildren(node.id));
    }
    
    return descendants;
  }

  /**
   * Get all nodes at a specific depth
   * @param {number} depth - The depth level
   * @returns {NavigationNode[]}
   */
  getNodesAtDepth(depth) {
    return Array.from(this.nodes.values()).filter(n => n.depth === depth);
  }

  /**
   * Get the maximum depth of the graph
   * @returns {number}
   */
  getMaxDepth() {
    let maxDepth = 0;
    for (const node of this.nodes.values()) {
      if (node.depth > maxDepth) {
        maxDepth = node.depth;
      }
    }
    return maxDepth;
  }

  /**
   * Check if a node is reachable from another
   * @param {string} fromId - Start node ID
   * @param {string} toId - Target node ID
   * @returns {boolean}
   */
  isReachable(fromId, toId) {
    return this.getPath(fromId, toId).length > 0;
  }

  /**
   * Check if adding an edge would create a cycle
   * @param {string} fromId - Source node ID
   * @param {string} toId - Target node ID
   * @returns {boolean}
   */
  wouldCreateCycle(fromId, toId) {
    return this.isReachable(toId, fromId);
  }

  // ==================== Exploration State ====================

  /**
   * Get all nodes that have unexplored links
   * @returns {NavigationNode[]}
   */
  getUnexploredNodes() {
    return Array.from(this.nodes.values())
      .filter(node => node.hasUnexploredLinks() && !node.isLeaf);
  }

  /**
   * Get unexplored links from a specific node
   * @param {string} nodeId - Node ID
   * @returns {Array<Object>}
   */
  getUnexploredLinks(nodeId) {
    const node = this.nodes.get(nodeId);
    return node ? node.unexploredLinks : [];
  }

  /**
   * Mark a link as explored on a node
   * @param {string} nodeId - Node ID
   * @param {string|Object} link - Link selector or link object
   */
  markLinkExplored(nodeId, link) {
    const node = this.nodes.get(nodeId);
    if (node) {
      if (typeof link === 'string') {
        const linkObj = node.unexploredLinks.find(l => l.selector === link || l.text === link);
        if (linkObj) node.markLinkExplored(linkObj);
      } else {
        node.markLinkExplored(link);
      }
    }
  }

  /**
   * Mark a node as a leaf (no further exploration possible)
   * @param {string} nodeId - Node ID
   */
  markAsLeaf(nodeId) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.isLeaf = true;
      node.unexploredLinks = [];
    }
  }

  /**
   * Get titles of all visited nodes
   * @returns {string[]}
   */
  getVisitedTitles() {
    return Array.from(this.nodes.values())
      .filter(n => n.visitCount > 0)
      .map(n => n.title)
      .filter(Boolean);
  }

  /**
   * Get visited URLs
   * @returns {string[]}
   */
  getVisitedUrls() {
    return Array.from(this.nodes.values())
      .filter(n => n.visitCount > 0)
      .map(n => n.url);
  }

  /**
   * Get total number of nodes
   * @returns {number}
   */
  get size() {
    return this.nodes.size;
  }

  /**
   * Get total number of edges
   * @returns {number}
   */
  get edgeCount() {
    let count = 0;
    for (const edges of this.edges.values()) {
      count += edges.length;
    }
    return count;
  }

  // ==================== Traversal ====================

  /**
   * Breadth-first traversal of the graph
   * @param {string} startId - Starting node ID
   * @param {Function} visitor - Callback function(node, depth, path) => boolean. Return false to stop.
   * @returns {Promise<void>}
   */
  async bfs(startId, visitor) {
    if (!this.nodes.has(startId)) return;
    
    const visited = new Set();
    const queue = [{ id: startId, depth: 0, path: [startId] }];
    
    while (queue.length > 0) {
      const { id, depth, path } = queue.shift();
      
      if (visited.has(id)) continue;
      visited.add(id);
      
      const node = this.nodes.get(id);
      if (!node) continue;
      
      const shouldContinue = await visitor(node, depth, path);
      if (shouldContinue === false) return;
      
      // Add children to queue
      for (const childId of node.children) {
        if (!visited.has(childId)) {
          queue.push({ id: childId, depth: depth + 1, path: [...path, childId] });
        }
      }
    }
  }

  /**
   * Depth-first traversal of the graph
   * @param {string} startId - Starting node ID
   * @param {Function} visitor - Callback function(node, depth, path) => boolean. Return false to stop.
   * @returns {Promise<void>}
   */
  async dfs(startId, visitor) {
    if (!this.nodes.has(startId)) return;
    
    const visited = new Set();
    
    const traverse = async (id, depth, path) => {
      if (visited.has(id)) return true;
      visited.add(id);
      
      const node = this.nodes.get(id);
      if (!node) return true;
      
      const shouldContinue = await visitor(node, depth, path);
      if (shouldContinue === false) return false;
      
      // Visit children
      for (const childId of node.children) {
        const result = await traverse(childId, depth + 1, [...path, childId]);
        if (result === false) return false;
      }
      
      return true;
    };
    
    await traverse(startId, 0, [startId]);
  }

  /**
   * Find the best next node to explore
   * Uses heuristics: prioritizes nodes with unexplored links at shallow depths
   * @returns {NavigationNode|null}
   */
  findBestNextNode() {
    const unexplored = this.getUnexploredNodes();
    
    if (unexplored.length === 0) return null;
    
    // Score each node
    const scored = unexplored.map(node => {
      let score = 0;
      
      // Prefer shallower nodes
      score -= node.depth * 10;
      
      // Prefer nodes with more unexplored links
      score += node.getUnexploredCount() * 2;
      
      // Prefer less visited nodes
      score -= node.visitCount * 5;
      
      // Boost nodes in navigation areas
      if (node.metadata.isNavigation) score += 15;
      
      // Boost feature/product pages
      const title = (node.title || '').toLowerCase();
      const url = (node.url || '').toLowerCase();
      if (title.includes('feature') || url.includes('feature')) score += 20;
      if (title.includes('product') || url.includes('product')) score += 15;
      if (title.includes('pricing') || url.includes('pricing')) score += 10;
      
      // Penalize login/auth pages
      if (title.includes('login') || url.includes('login')) score -= 50;
      if (title.includes('signup') || url.includes('signup')) score -= 50;
      
      return { node, score };
    });
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0]?.node || null;
  }

  // ==================== Serialization ====================

  /**
   * Export graph to JSON
   * @returns {Object}
   */
  toJSON() {
    const nodes = {};
    for (const [id, node] of this.nodes) {
      nodes[id] = node.toJSON();
    }
    
    const edges = [];
    for (const edgeList of this.edges.values()) {
      for (const edge of edgeList) {
        edges.push(edge.toJSON());
      }
    }
    
    return {
      rootId: this.rootId,
      nodes,
      edges,
      metadata: this.metadata
    };
  }

  /**
   * Import graph from JSON
   * @param {Object} data - JSON data
   * @returns {NavigationGraph}
   */
  static fromJSON(data) {
    const graph = new NavigationGraph();
    
    // Restore metadata
    graph.metadata = data.metadata || graph.metadata;
    
    // Restore nodes
    for (const [id, nodeData] of Object.entries(data.nodes || {})) {
      const node = NavigationNode.fromJSON(nodeData);
      graph.nodes.set(id, node);
      graph.edges.set(id, []);
      graph.reverseEdges.set(id, []);
    }
    
    // Restore edges
    for (const edgeData of data.edges || []) {
      const edge = new NavigationEdge(edgeData.fromId, edgeData.toId, {
        via: edgeData.via,
        type: edgeData.type
      });
      edge.createdAt = edgeData.createdAt;
      edge.traverseCount = edgeData.traverseCount;
      
      if (!graph.edges.has(edge.fromId)) {
        graph.edges.set(edge.fromId, []);
      }
      graph.edges.get(edge.fromId).push(edge);
      
      if (!graph.reverseEdges.has(edge.toId)) {
        graph.reverseEdges.set(edge.toId, []);
      }
      graph.reverseEdges.get(edge.toId).push(edge);
    }
    
    // Set root
    graph.rootId = data.rootId;
    
    return graph;
  }

  /**
   * Export graph as Mermaid diagram
   * @param {Object} [options] - Diagram options
   * @param {boolean} [options.showUrls] - Include URLs in labels
   * @param {boolean} [options.showDepth] - Include depth in labels
   * @returns {string} Mermaid diagram code
   */
  toMermaid(options = {}) {
    const { showUrls = false, showDepth = false } = options;
    
    const lines = ['graph TD'];
    
    // Generate safe node IDs for Mermaid
    const nodeIds = new Map();
    let counter = 0;
    for (const id of this.nodes.keys()) {
      nodeIds.set(id, `N${counter++}`);
    }
    
    // Add nodes
    for (const [id, node] of this.nodes) {
      const mermaidId = nodeIds.get(id);
      let label = node.title || node.url || id;
      
      // Escape special characters
      label = label.replace(/"/g, "'").replace(/[[\]]/g, '');
      
      // Truncate long labels
      if (label.length > 40) {
        label = label.slice(0, 37) + '...';
      }
      
      if (showDepth) {
        label = `[${node.depth}] ${label}`;
      }
      
      if (showUrls && node.url) {
        const path = new URL(node.url).pathname;
        label = `${label}<br/>${path}`;
      }
      
      // Style based on state
      let style = '';
      if (id === this.rootId) {
        style = ':::root';
      } else if (node.isLeaf) {
        style = ':::leaf';
      } else if (node.hasUnexploredLinks()) {
        style = ':::unexplored';
      }
      
      lines.push(`  ${mermaidId}["${label}"]${style}`);
    }
    
    // Add edges
    for (const [fromId, edgeList] of this.edges) {
      for (const edge of edgeList) {
        const fromMermaid = nodeIds.get(edge.fromId);
        const toMermaid = nodeIds.get(edge.toId);
        
        if (fromMermaid && toMermaid) {
          const label = edge.via?.text ? `|"${edge.via.text.slice(0, 20)}"|` : '';
          lines.push(`  ${fromMermaid} -->${label} ${toMermaid}`);
        }
      }
    }
    
    // Add styles
    lines.push('');
    lines.push('  classDef root fill:#f9f,stroke:#333,stroke-width:2px');
    lines.push('  classDef leaf fill:#bbf,stroke:#333');
    lines.push('  classDef unexplored fill:#fbb,stroke:#333');
    
    return lines.join('\n');
  }

  /**
   * Get a summary of the graph
   * @returns {Object}
   */
  getSummary() {
    const nodes = Array.from(this.nodes.values());
    
    return {
      totalNodes: this.size,
      totalEdges: this.edgeCount,
      maxDepth: this.getMaxDepth(),
      visitedNodes: nodes.filter(n => n.visitCount > 0).length,
      leafNodes: nodes.filter(n => n.isLeaf).length,
      nodesWithUnexploredLinks: this.getUnexploredNodes().length,
      totalUnexploredLinks: nodes.reduce((sum, n) => sum + n.getUnexploredCount(), 0),
      rootUrl: this.getRoot()?.url || null
    };
  }
}

/**
 * Create a unique node ID from URL and optional state hash
 * @param {string} url - Page URL
 * @param {string|null} [stateHash] - SPA state hash
 * @returns {string}
 */
export function createNodeId(url, stateHash = null) {
  // Normalize URL
  try {
    const parsed = new URL(url);
    // Remove trailing slash for consistency
    let normalized = `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}`;
    
    // Include search params if present (might indicate different state)
    if (parsed.search) {
      normalized += parsed.search;
    }
    
    // Append state hash for SPA states
    if (stateHash) {
      normalized += `#state:${stateHash}`;
    }
    
    return normalized;
  } catch {
    return url;
  }
}

export default NavigationGraph;
