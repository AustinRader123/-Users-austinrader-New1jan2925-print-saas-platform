export async function getDecryptedCredentials(_connectionId: string) {
  return { username: '', password: '' };
}

export async function getConnection(_connectionId: string) {
  return { id: _connectionId, storeId: 'store_1', baseUrl: '' };
}
