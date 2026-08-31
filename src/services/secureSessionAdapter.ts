import { AFTER_FIRST_UNLOCK, setItemAsync, getItemAsync, deleteItemAsync } from "expo-secure-store";

export const SecureSessionAdapter = {
    async setItem(key: string, value: string): Promise<void> {
        try {
            await setItemAsync(key, value, { keychainAccessible: AFTER_FIRST_UNLOCK });
        } catch (error) {
            console.error("Erro ao salvar dado seguro:", error);
            throw error;
        }
    },

    async getItem(key: string): Promise<string | null> {
        try {
            return await getItemAsync(key, { keychainAccessible: AFTER_FIRST_UNLOCK });
        } catch (error) {
            console.error('Erro ao recuperar dado seguro:', error);
            return null;
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            await deleteItemAsync(key);
        } catch (error) {
            console.error('Erro ao remover dado seguro:', error);
            throw error;
        }
    }
};
