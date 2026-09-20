export function formatarMoeda(valor: number | null | undefined): string {
    return `R$ ${(valor ?? 0).toFixed(2).replace('.', ',')}`;
}

// O backend calcula tudo em America/Sao_Paulo (ver DashboardService no repositório da API).
// Brasil não usa horário de verão desde 2019, então o offset é fixo em -03:00 o ano todo.
// Calculamos manualmente em vez de usar toLocaleString/Intl com timeZone: o fuso do
// dispositivo (ou do emulador) pode não estar configurado como Brasil, e o motor Hermes
// nem sempre traz dados de fuso horário completos — isso fazia a hora/data do pagamento
// aparecer adiantada e o filtro "Hoje" do Dashboard não bater com o dia real no Brasil.
const OFFSET_BRASIL_MS = -3 * 60 * 60 * 1000;

function paraHorarioBrasil(data: Date): Date {
    return new Date(data.getTime() + OFFSET_BRASIL_MS);
}

export function formatarDataHora(data: string): string {
    const horario = paraHorarioBrasil(new Date(data));
    const dia = String(horario.getUTCDate()).padStart(2, '0');
    const mes = String(horario.getUTCMonth() + 1).padStart(2, '0');
    const hora = String(horario.getUTCHours()).padStart(2, '0');
    const minuto = String(horario.getUTCMinutes()).padStart(2, '0');
    return `${dia}/${mes} ${hora}:${minuto}`;
}

export function paraDataISOBrasil(data: Date): string {
    const horario = paraHorarioBrasil(data);
    const ano = horario.getUTCFullYear();
    const mes = String(horario.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(horario.getUTCDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

export function subtrairDiasData(dataISO: string, dias: number): string {
    const [ano, mes, dia] = dataISO.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia - dias));
    return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}-${String(data.getUTCDate()).padStart(2, '0')}`;
}

export function formatarTempoDecorrido(data: string): string {
    const minutos = Math.max(0, Math.floor((Date.now() - new Date(data).getTime()) / 60000));

    if (minutos < 1) {
        return 'agora mesmo';
    }
    if (minutos < 60) {
        return `há ${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    if (horas < 24) {
        return `há ${horas} h`;
    }

    const dias = Math.floor(horas / 24);
    return `há ${dias} d`;
}
