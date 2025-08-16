const directionToFoodTags: Record<string, string[]> = {
  温补助阳: ['温热蛋白', '高能量食材', '温补谷物', '炖煮红烧'],
  清热祛暑: ['清热蔬菜', '瓜类食材', '豆类制品', '凉拌清蒸'],
  祛湿健脾: ['发酵食品', '利湿蔬菜', '薏米', '健脾汤类'],
  滋阴润肺: ['胶质食物', '白色食材', '多汁水果', '蒸煮润燥'],
  疏肝理气: ['芳香蔬菜', '理气水果', '花香茶饮', '温和蛋白'],
};

export function mapWeightsToFoodTags(weights: Record<string, number>): string[] {
  const sortedDirections = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .map(([dir]) => dir);

  const recommendedTags: string[] = [];
  sortedDirections.forEach(dir => {
    if (directionToFoodTags[dir]) {
      recommendedTags.push(...directionToFoodTags[dir]);
    }
  });

  return [...new Set(recommendedTags)];
}
