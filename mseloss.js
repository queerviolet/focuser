const mseLoss = (data, model) => data
    // 👇🏾 Reduce data to the sum 👇🏾 of error 👇🏾    👇🏾 squared
    .reduce((sum, {x, y}) => sum + (model(x) - y) ** 2, 0) / data.length
    // ...divided by the number of points to get the mean  👆🏾
const line = ({m, b}) => x => m * x + b
mseLoss(splatter, line({m: 0.2, b: 0.1}))