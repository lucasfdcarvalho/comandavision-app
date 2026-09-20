import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FormaPagamento } from "../types/Pagamento";

// Ícones de pagamento ficam fora do padrão "só Feather" do resto do app de propósito:
// Feather não tem glifo de dinheiro/cédula, QR code nem banco, e são exatamente os
// ícones que os apps de pagamento brasileiros usam de verdade para cada forma
// (Pix é fortemente associado a QR Code, não existe um "logo Pix" genérico disponível).
export const ICONE_FORMA: Record<FormaPagamento, keyof typeof MaterialCommunityIcons.glyphMap> = {
    PIX: 'qrcode',
    DINHEIRO: 'cash',
    CARTAO_CREDITO: 'credit-card-outline',
    CARTAO_DEBITO: 'bank-outline',
};

export const ROTULO_FORMA: Record<FormaPagamento, string> = {
    PIX: 'Pix',
    DINHEIRO: 'Dinheiro',
    CARTAO_DEBITO: 'Débito',
    CARTAO_CREDITO: 'Crédito',
};
