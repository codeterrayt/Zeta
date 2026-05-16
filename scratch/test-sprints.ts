import { prisma } from "../src/lib/prisma";
import { getProjectSprints } from "../src/actions/sprint";

async function test() {
  const projectId = "cmp81sj5e00016wf50mvc8eeq";
  try {
    const res = await getProjectSprints(projectId);
    console.log("Result:", JSON.stringify(res, null, 2));
  } catch (e) {
    console.error("Test failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
