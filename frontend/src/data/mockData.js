// Mock data based on API examples from htnguonsong.com
export const mockSongs = [
  {
    "id": 140,
    "title": "A-ba Cha yêu ơi",
    "slug": "a-ba-cha-yeu-oi",
    "key_chord": "G",
    "first_lyric": "Aba Cha yêu ơi, hỡi Chúa Cha cao vời",
    "chorus": "Ngài biết rõ mỗi nỗi lòng, mỗi niềm đau",
    "type_id": 4,
    "topic_id": null,
    "tempo": null,
    "created_date": "2021-10-20 13:03:53",
    "updated_date": "2024-04-20 05:23:58",
    "type_name": "Thờ Phượng",
    "topic_name": null
  },
  {
    "id": 164,
    "title": "Bài Ca Đắc Thắng",
    "slug": "bai-ca-dac-thang",
    "key_chord": "Dm",
    "first_lyric": "Ngài là Chúa, Đấng đã dựng nên vũ trụ. Nhờ danh",
    "chorus": "Lạy Cha , Chúa luôn đắc thắng huy hoàng",
    "type_id": 3,
    "topic_id": null,
    "tempo": null,
    "created_date": "2022-03-25 15:10:11",
    "updated_date": "2022-03-25 15:10:11",
    "type_name": "Ngợi Khen",
    "topic_name": null
  },
  {
    "id": 125,
    "title": "Bài Ca Ngợi Khen",
    "slug": "bai-ca-ngoi-khen",
    "key_chord": "Em",
    "first_lyric": "Hãy đưa tay lên hướng về nơi thánh và ngợi khen Giê-hô-va",
    "chorus": "Khá hát xướng ca trong nhà Giê-hô-va, chúc tán Chúa",
    "type_id": 3,
    "topic_id": null,
    "tempo": 120,
    "created_date": "2021-06-03 04:14:29",
    "updated_date": "2021-06-03 04:14:29",
    "type_name": "Ngợi Khen",
    "topic_name": null
  },
  {
    "id": 146,
    "title": "Bình An Cho Loài Người",
    "slug": "binh-an-cho-loai-nguoi",
    "key_chord": "Em",
    "first_lyric": "Hoà bình dưới đất hỉ hoan cho người vì hôm nay",
    "chorus": "Từ trơi cao các thiên binh đem tin vui này",
    "type_id": 13,
    "topic_id": 1,
    "tempo": null,
    "created_date": "2021-12-01 12:55:19",
    "updated_date": "2025-05-31 04:35:50",
    "type_name": "Giáng sinh",
    "topic_name": "Giáng Sinh"
  },
  {
    "id": 58,
    "title": "Bởi Ân Điển Chúa",
    "slug": "boi-an-dien-chua",
    "key_chord": "C",
    "first_lyric": "Bởi Ân Điển mà con đến chốn này, tình yêu Cha",
    "chorus": "Biết ơn Giê-xu, Giê-xu, Giê-xu con biết ơn Ngài",
    "type_id": 4,
    "topic_id": null,
    "tempo": 90,
    "created_date": "2020-09-27 02:51:43",
    "updated_date": "2023-09-30 06:28:09",
    "type_name": "Thờ Phượng",
    "topic_name": null
  },
  {
    "id": 137,
    "title": "Xin Dâng Lên Cha",
    "slug": "xin-dang-len-cha",
    "key_chord": "C",
    "first_lyric": "Xin dâng lên Cha trọn lòng này",
    "chorus": "Mọi điều con có trong đời",
    "type_id": 6,
    "topic_id": null,
    "tempo": null,
    "created_date": "2021-10-06 13:08:18",
    "updated_date": "2025-08-23 09:06:10",
    "type_name": "Dâng hiến",
    "topic_name": null
  }
];

export const mockSongDetail = {
  "id": 137,
  "title": "Xin Dâng Lên Cha",
  "slug": "xin-dang-len-cha",
  "lyric": "[1]\r\n[C]Xin dâng lên Cha trọn lòng [F]này. [C]Xin dâng lên Cha cuộc đời [G]con.\r\n[C]Xin dâng lên Cha từng ngày con [Am]sống. Dâng [F]lên cho [G]Chúa trọn tâm [C]linh.\r\n[chorus]\r\n[F]Mọi điều [G]con có trong [C]đời. [F]Và từng [G]hơi thở trong [C]con.\r\n[F]Xin dâng lên [G]tay Cha với [Em]cả lòng biết [Am]ơn Ngài. [F]Con sẽ [G]sống cho [C]Cha.\r\n",
  "key_chord": "C",
  "type_id": 6,
  "first_lyric": "Xin dâng lên Cha trọn lòng này",
  "chorus": "Mọi điều con có trong đời",
  "topic_id": null,
  "tempo": null,
  "link_song": "",
  "created_date": "2021-10-06 13:08:18",
  "updated_date": "2025-08-23 09:06:10",
  "type_name": "Dâng hiến",
  "topic_name": null
};

export const mockTypes = [
  { "id": 11, "type_name": "Bình an" },
  { "id": 9, "type_name": "Chiến thắng" },
  { "id": 6, "type_name": "Dâng hiến" },
  { "id": 5, "type_name": "Đơn ca" },
  { "id": 13, "type_name": "Giáng sinh" },
  { "id": 3, "type_name": "Ngợi Khen" },
  { "id": 4, "type_name": "Thờ Phượng" },
  { "id": 7, "type_name": "Tôn vinh" },
  { "id": 10, "type_name": "Vui mừng" },
  { "id": 12, "type_name": "Vui vẻ" }
];

export const mockTopics = [
  { "id": 5, "topic_name": "Cha mẹ" },
  { "id": 1, "topic_name": "Giáng Sinh" },
  { "id": 6, "topic_name": "Mùa Xuân" },
  { "id": 2, "topic_name": "Phục sinh" },
  { "id": 3, "topic_name": "Thương khó" }
];

export const mockKeyChords = [
  "A", "Am", "Bm", "C", "D", "Dm", "E", "Eb", "Em", "F", "F#m", "G"
];

export const mockPagination = {
  "current_page": 1,
  "per_page": 10,
  "total_items": 192,
  "total_pages": 20,
  "has_next": true,
  "has_prev": false
};