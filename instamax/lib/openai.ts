import OpenAI from 'openai'
import type { InstagramProfile, MediaItem, AnalysisData, ScheduleData, ContentItem } from '@/types'

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateAnalysis(
  profile: InstagramProfile,
  media: MediaItem[],
  niche: string,
  objective: string
): Promise<AnalysisData> {
  const mediaContext = media.slice(0, 12).map(m => ({
    type: m.media_type,
    caption: m.caption?.slice(0, 200),
    likes: m.like_count,
    comments: m.comments_count,
    date: m.timestamp,
  }))

  const prompt = `Você é um consultor especialista em crescimento no Instagram com mais de 10 anos de experiência. Faça uma análise profunda e honesta deste perfil.

PERFIL:
- Username: @${profile.username}
- Nome: ${profile.full_name}
- Bio: ${profile.bio}
- Seguidores: ${profile.followers_count}
- Seguindo: ${profile.following_count}
- Total de posts: ${profile.media_count}
- Nicho informado: ${niche}
- Objetivo: ${objective}

ÚLTIMOS CONTEÚDOS:
${JSON.stringify(mediaContext, null, 2)}

Retorne SOMENTE um JSON válido com esta estrutura exata:
{
  "summary": "resumo executivo da análise (3-4 frases diretas e honestas)",
  "score": número de 0 a 100 representando saúde geral do perfil,
  "strengths": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "weaknesses": ["ponto fraco 1", "ponto fraco 2", "ponto fraco 3"],
  "opportunities": ["oportunidade 1", "oportunidade 2", "oportunidade 3"],
  "positioning": "como o perfil deve se posicionar no nicho (2-3 frases)",
  "voice_tone": "tom de voz recomendado e como comunicar com o público-alvo",
  "content_pillars": ["pilar 1", "pilar 2", "pilar 3", "pilar 4"],
  "hashtag_strategy": "estratégia completa de hashtags: quantas usar, quais tipos, exemplos",
  "posting_frequency": "frequência ideal de postagem por formato (posts, reels, stories)",
  "best_times": ["horário 1", "horário 2", "horário 3"],
  "profile_fixes": [
    {
      "area": "nome da área (ex: Bio, Foto de perfil, Nome de usuário)",
      "current": "o que está hoje",
      "recommended": "o que deve ser mudado e por quê",
      "priority": "alta|média|baixa"
    }
  ],
  "growth_forecast": "previsão realista de crescimento em 3 meses seguindo as recomendações"
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  return JSON.parse(response.choices[0].message.content!) as AnalysisData
}

export async function generateSchedule(
  profile: InstagramProfile,
  analysisData: AnalysisData,
  type: 'week' | 'month'
): Promise<ScheduleData> {
  const days = type === 'week' ? 7 : 30
  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1)

  const prompt = `Você é um estrategista de conteúdo especialista em Instagram. Crie um cronograma detalhado e pronto para executar.

PERFIL: @${profile.username} | Nicho analisado
ANÁLISE:
- Pilares de conteúdo: ${analysisData.content_pillars.join(', ')}
- Tom de voz: ${analysisData.voice_tone}
- Posicionamento: ${analysisData.positioning}
- Frequência recomendada: ${analysisData.posting_frequency}
- Melhores horários: ${analysisData.best_times.join(', ')}
- Hashtag strategy: ${analysisData.hashtag_strategy}

Crie um cronograma para ${days} dias começando em ${startDate.toISOString().split('T')[0]}.

Retorne SOMENTE um JSON válido:
{
  "period": "${type === 'week' ? '7' : '30'} dias",
  "total_posts": número total de conteúdos,
  "days": [
    {
      "date": "YYYY-MM-DD",
      "day_of_week": "Segunda-feira",
      "items": [
        {
          "id": "único-id",
          "type": "post|reel|story|carrossel",
          "time": "HH:MM",
          "theme": "tema do conteúdo",
          "title": "título criativo do conteúdo",
          "description": "descrição detalhada do que filmar/fotografar/criar (seja específico: cenário, ângulo, roupa, expressão)",
          "caption": "legenda completa pronta para postar com emojis e quebras de linha",
          "hashtags": ["hashtag1", "hashtag2", ... até 20],
          "visual_description": "descrição visual detalhada para geração de imagem com IA",
          "tips": ["dica de produção 1", "dica 2"],
          "estimated_reach": "estimativa de alcance (ex: 500-800 pessoas)",
          "cta": "call to action específico"
        }
      ]
    }
  ]
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
    max_tokens: type === 'month' ? 8000 : 4000,
  })

  return JSON.parse(response.choices[0].message.content!) as ScheduleData
}

export async function generateImage(
  prompt: string,
  analysisData: AnalysisData,
  styleContext: string
): Promise<{ url: string; revised_prompt: string }> {
  const enhancedPrompt = `${prompt}.
Estilo visual: ${styleContext}.
Tom: ${analysisData.voice_tone}.
Posicionamento: ${analysisData.positioning}.
Formato: quadrado (1:1), qualidade profissional para Instagram.`

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: enhancedPrompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  })

  const image = response.data?.[0]
  if (!image?.url) throw new Error('No image returned from DALL-E')
  return {
    url: image.url,
    revised_prompt: image.revised_prompt ?? prompt,
  }
}
