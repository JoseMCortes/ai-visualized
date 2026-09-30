/**
 * The exact PyTorch snippet this demo was checked against — run it
 * yourself and it prints the same attention weights, output, and loss (up
 * to rounding) as the training panel above.
 */

export const PYTORCH_REFERENCE = `import torch
X = torch.tensor([[1, 0, 0], [0, 1, .5], [0, .5, 1]])        # the, cat, sat
WQ = torch.tensor([[.5, 0, 0], [0, .5, .5], [.5, 0, 1]], requires_grad=True)
WK = torch.tensor([[1., 0, 0], [0, 1, 0], [0, .5, .5]], requires_grad=True)
WV = torch.tensor([[.5, 0, 0], [0, 1, 0], [0, 0, .5]], requires_grad=True)
target = torch.tensor([0, 1, .5])

for step in range(2):
    q, K, V = X[2] @ WQ, X @ WK, X @ WV
    a = torch.softmax(K @ q / 3 ** 0.5, dim=0)   # attention weights
    out = a @ V
    loss = ((out - target) ** 2).sum()
    print(step, a.detach(), out.detach(), round(loss.item(), 3))
    loss.backward()
    with torch.no_grad():
        for W in (WQ, WK, WV):
            W -= 0.5 * W.grad
            W.grad.zero_()`;
