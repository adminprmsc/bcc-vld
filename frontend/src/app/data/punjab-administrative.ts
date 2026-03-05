export interface PunjabAdministrativeHierarchy {
  division: string;
  districts: Array<{
    name: string;
    tehsils: string[];
  }>;
}

/**
 * Division, district, and tehsil listings compiled from the Punjab Portal (https://www.punjab.gov.pk/districts),
 * the Pakistan Bureau of Statistics 2023 district census tables, and the "List of tehsils of Punjab, Pakistan"
 * article on Wikipedia (last accessed 2025-10-19). These sources reflect the post-2022 administrative updates such
 * as Kot Addu, Taunsa, Wazirabad, Murree, and Talagang districts.
 */
export const PUNJAB_ADMINISTRATIVE_DATA: PunjabAdministrativeHierarchy[] = [
  {
    division: 'Bahawalpur',
    districts: [
      {
        name: 'Bahawalpur',
        tehsils: ['Ahmadpur East', 'Bahawalpur City', 'Bahawalpur Saddar', 'Hasilpur', 'Khairpur Tamewali', 'Yazman']
      },
      {
        name: 'Bahawalnagar',
        tehsils: ['Bahawalnagar', 'Chishtian', 'Fort Abbas', 'Haroonabad', 'Minchinabad']
      },
      {
        name: 'Rahim Yar Khan',
        tehsils: ['Rahim Yar Khan', 'Sadiqabad', 'Khanpur', 'Liaqatpur']
      }
    ]
  },
  {
    division: 'Dera Ghazi Khan',
    districts: [
      {
        name: 'Dera Ghazi Khan',
        tehsils: ['Dera Ghazi Khan', 'Kot Chutta']
      },
      {
        name: 'Layyah',
        tehsils: ['Layyah', 'Karor Lal Esan', 'Chaubara']
      },
      {
        name: 'Muzaffargarh',
        tehsils: ['Muzaffargarh', 'Jatoi', 'Alipur']
      },
      {
        name: 'Rajanpur',
        tehsils: ['Rajanpur', 'Jampur', 'Dajal', 'Rojhan', 'Muhammadpur', 'De-Excluded Area Rajanpur']
      },
      {
        name: 'Kot Addu',
        tehsils: ['Kot Addu', 'Chowk Sarwar Shaheed']
      },
      {
        name: 'Taunsa',
        tehsils: ['Taunsa', 'Vehova', 'Koh-e-Suleman']
      }
    ]
  },
  {
    division: 'Faisalabad',
    districts: [
      {
        name: 'Faisalabad',
        tehsils: ['Faisalabad City', 'Faisalabad Sadar', 'Jaranwala', 'Samundri', 'Tandlianwala', 'Chak Jhumra']
      },
      {
        name: 'Chiniot',
        tehsils: ['Chiniot', 'Lalian', 'Bhowana']
      },
      {
        name: 'Jhang',
        tehsils: ['Jhang', 'Shorkot', 'Ahmadpur Sial', 'Athara Hazari', 'Mandi Shah Jeewna']
      },
      {
        name: 'Toba Tek Singh',
        tehsils: ['Toba Tek Singh', 'Gojra', 'Kamalia', 'Pirmahal']
      }
    ]
  },
  {
    division: 'Gujranwala',
    districts: [
      {
        name: 'Gujranwala',
        tehsils: ['Gujranwala City', 'Gujranwala Saddar', 'Kamoke', 'Nowshera Virkan']
      },
      {
        name: 'Narowal',
        tehsils: ['Narowal', 'Shakargarh', 'Zafarwal']
      },
      {
        name: 'Sialkot',
        tehsils: ['Sialkot', 'Daska', 'Sambrial', 'Pasrur']
      }
    ]
  },
  {
    division: 'Gujrat',
    districts: [
      {
        name: 'Gujrat',
        tehsils: ['Gujrat', 'Kharian', 'Sarai Alamgir', 'Jalalpur Jattan', 'Kunjah']
      },
      {
        name: 'Hafizabad',
        tehsils: ['Hafizabad', 'Pindi Bhattian']
      },
      {
        name: 'Mandi Bahauddin',
        tehsils: ['Mandi Bahauddin', 'Phalia', 'Malakwal']
      },
      {
        name: 'Wazirabad',
        tehsils: ['Wazirabad', 'Ali Pur Chatta']
      }
    ]
  },
  {
    division: 'Lahore',
    districts: [
      {
        name: 'Lahore',
        tehsils: ['Lahore City', 'Model Town', 'Shalimar', 'Lahore Cantonment', 'Raiwind', 'Iqbal Town', 'Wagah', 'Nishtar']
      },
      {
        name: 'Kasur',
        tehsils: ['Kasur', 'Chunian', 'Pattoki', 'Kot Radha Kishan']
      },
      {
        name: 'Sheikhupura',
        tehsils: ['Sheikhupura', 'Ferozewala', 'Muridke', 'Safdarabad', 'Sharak Pur']
      },
      {
        name: 'Nankana Sahib',
        tehsils: ['Nankana Sahib', 'Sangla Hill', 'Shah Kot']
      }
    ]
  },
  {
    division: 'Multan',
    districts: [
      {
        name: 'Multan',
        tehsils: ['Multan City', 'Multan Saddar', 'Jalalpur Pirwala', 'Shujabad']
      },
      {
        name: 'Khanewal',
        tehsils: ['Khanewal', 'Mian Channu', 'Kabirwala', 'Jahanian']
      },
      {
        name: 'Lodhran',
        tehsils: ['Lodhran', 'Dunyapur', 'Kahror Pacca']
      },
      {
        name: 'Vehari',
        tehsils: ['Vehari', 'Burewala', 'Mailsi']
      }
    ]
  },
  {
    division: 'Rawalpindi',
    districts: [
      {
        name: 'Rawalpindi',
        tehsils: ['Rawalpindi', 'Gujar Khan', 'Kahuta', 'Kallar Syedan', 'Taxila', 'Daultala']
      },
      {
        name: 'Attock',
        tehsils: ['Attock', 'Fateh Jang', 'Hasan Abdal', 'Hazro', 'Jand', 'Pindi Gheb']
      },
      {
        name: 'Chakwal',
        tehsils: ['Chakwal', 'Choa Saidan Shah', 'Kallar Kahar']
      },
      {
        name: 'Jhelum',
        tehsils: ['Jhelum', 'Dina', 'Sohawa', 'Pind Dadan Khan']
      },
      {
        name: 'Murree',
        tehsils: ['Murree', 'Kotli Sattian']
      },
      {
        name: 'Talagang',
        tehsils: ['Talagang', 'Lawa', 'Multan Khurd']
      }
    ]
  },
  {
    division: 'Sahiwal',
    districts: [
      {
        name: 'Sahiwal',
        tehsils: ['Sahiwal', 'Chichawatni']
      },
      {
        name: 'Pakpattan',
        tehsils: ['Pakpattan', 'Arifwala']
      },
      {
        name: 'Okara',
        tehsils: ['Okara', 'Depalpur', 'Renala Khurd']
      }
    ]
  },
  {
    division: 'Sargodha',
    districts: [
      {
        name: 'Sargodha',
        tehsils: ['Sargodha', 'Bhalwal', 'Bhera', 'Kot Momin', 'Sahiwal', 'Shahpur', 'Sillanwali']
      },
      {
        name: 'Khushab',
        tehsils: ['Khushab', 'Noorpur Thal', 'Quaidabad', 'Naushera']
      },
      {
        name: 'Bhakkar',
        tehsils: ['Bhakkar', 'Darya Khan', 'Kaloorkot', 'Mankera']
      },
      {
        name: 'Mianwali',
        tehsils: ['Mianwali', 'Isakhel', 'Piplan']
      }
    ]
  }
];
