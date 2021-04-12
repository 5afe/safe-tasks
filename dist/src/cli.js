"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.HARDHAT_CONFIG = "/home/rmeissner/projects/safe-tasks/dist/hardhat.config.js";
console.log("HI", process.env);
const hardhat_1 = __importDefault(require("hardhat"));
async function main() {
    console.log(hardhat_1.default.tasks);
    console.log("HI");
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
    console.error(error);
    process.exit(1);
});
