import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

type Props = {
    children: React.ReactNode;
    // Atraso em ms, para escalonar vários blocos (um depois do outro).
    atraso?: number;
    style?: StyleProp<ViewStyle>;
};

// Entrada discreta: o conteúdo esmaece e sobe 8px ao montar, em vez de surgir de repente.
export function AparecerSuave({ children, atraso = 0, style }: Props) {
    const progresso = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animacao = Animated.timing(progresso, {
            toValue: 1,
            duration: 260,
            delay: atraso,
            useNativeDriver: true,
        });
        animacao.start();
        return () => animacao.stop();
    }, [progresso, atraso]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: progresso,
                    transform: [{ translateY: progresso.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
                },
            ]}>
            {children}
        </Animated.View>
    );
}
