import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Keyboard, View } from 'react-native';
import { Dialogo } from '../components/Dialogo';
import { DialogoController, type BotaoDialogo, type TipoDialogo } from '../utils/dialogoController';

const DialogoContext = createContext<DialogoController | null>(null);

export function DialogoProvider({ children }: { children: ReactNode }) {
    const [controller] = useState(() => new DialogoController());
    const dialogo = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

    return (
        <DialogoContext.Provider value={controller}>
            <View style={{ flex: 1 }} accessibilityElementsHidden={Boolean(dialogo)} importantForAccessibility={dialogo ? 'no-hide-descendants' : 'auto'}>
                {children}
            </View>
            {dialogo ? (
                <Dialogo
                    dialogo={dialogo}
                    onFechar={() => controller.fechar(dialogo.id)}
                    onSelecionar={(indice) => { void controller.selecionar(dialogo.id, indice); }}
                />
            ) : null}
        </DialogoContext.Provider>
    );
}

export function useDialogo() {
    const controller = useContext(DialogoContext);
    const origem = useId();
    const montado = useRef(true);
    if (!controller) throw new Error('useDialogo deve estar dentro de DialogoProvider');

    useEffect(() => {
        montado.current = true;
        return () => {
            montado.current = false;
            controller.removerOrigem(origem);
        };
    }, [controller, origem]);

    const alertar = useCallback((titulo: string, mensagem: string, botoes?: BotaoDialogo[], tipo?: TipoDialogo, aoFechar?: () => void) => {
        if (!montado.current) return;
        Keyboard.dismiss();
        controller.abrir(origem, titulo, mensagem, botoes, tipo, aoFechar);
    }, [controller, origem]);

    const mostrarSucesso = useCallback((titulo: string, mensagem: string, aoFechar?: () => void) => {
        alertar(titulo, mensagem, [], 'sucesso', aoFechar);
    }, [alertar]);

    return { alertar, mostrarSucesso };
}
