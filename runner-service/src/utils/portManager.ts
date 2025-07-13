let basePort = 8000;
const usedPorts = new Set<number>();

export function getAvailablePort(): number {
  while (usedPorts.has(basePort)) {
    basePort++;
  }
  
  usedPorts.add(basePort);
  return basePort;
}

export function releasePort(port: number) {
  usedPorts.delete(port);
}
