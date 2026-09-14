/** Renders one small decision tree (a boosting round) as a simple connected-box diagram. */

import { FEATURE_LABELS, FEATURE_NAMES } from '../lib/features';
import type { TreeNode } from '../lib/ltr';

export interface TreeView {
  el: HTMLElement;
  render(tree: TreeNode | null, round: number): void;
}

function nodeEl(node: TreeNode): HTMLElement {
  const li = document.createElement('li');
  const box = document.createElement('span');
  box.className = 'tree-node' + (node.isLeaf ? ' is-leaf' : '');
  if (node.isLeaf) {
    box.innerHTML = `<strong>${node.value >= 0 ? '+' : ''}${node.value.toFixed(2)}</strong><br><span class="tree-n">${node.n} example${node.n === 1 ? '' : 's'}</span>`;
  } else {
    const name = FEATURE_NAMES[node.featureIndex]!;
    box.innerHTML = `${name} ≤ ${node.threshold.toFixed(2)}?<br><span class="tree-n">${FEATURE_LABELS[name]}</span>`;
  }
  li.appendChild(box);

  if (!node.isLeaf) {
    const ul = document.createElement('ul');
    const leftLi = nodeEl(node.left);
    const leftTag = document.createElement('span');
    leftTag.className = 'tree-tag';
    leftTag.textContent = 'yes';
    leftLi.prepend(leftTag);
    const rightLi = nodeEl(node.right);
    const rightTag = document.createElement('span');
    rightTag.className = 'tree-tag';
    rightTag.textContent = 'no';
    rightLi.prepend(rightTag);
    ul.append(leftLi, rightLi);
    li.appendChild(ul);
  }
  return li;
}

export function createTreeView(): TreeView {
  const el = document.createElement('div');
  el.className = 'tree-view';
  const heading = document.createElement('div');
  heading.className = 'field-label';
  const host = document.createElement('ul');
  host.className = 'tree tree-root';
  el.append(heading, host);

  function render(tree: TreeNode | null, round: number): void {
    heading.textContent = tree
      ? `Tree added in round ${round}`
      : 'Press Step to add the first tree';
    host.replaceChildren();
    if (tree) host.appendChild(nodeEl(tree));
  }

  return { el, render };
}
